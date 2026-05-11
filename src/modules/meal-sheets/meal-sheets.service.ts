import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  BulkUpdateSheetDto,
  ExportFormat,
  LockMonthDto,
  MealSheetExportQueryDto,
  MealSheetMonthQueryDto,
  UpdateCellDto,
} from './dto/meal-sheet.dto.js';

type SkipReason =
  | 'PAST_DAY'
  | 'DEADLINE_PASSED'
  | 'MONTH_LOCKED'
  | 'BEFORE_JOIN_DATE'
  | 'USER_NOT_IN_HOUSE';

@Injectable()
export class MealSheetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- date helpers ----------

  private parseDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private toMonthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthRange(month: string): { start: Date; end: Date } {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 0));
    return { start, end };
  }

  private getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private isPastDeadline(): boolean {
    return new Date().getUTCHours() >= 10;
  }

  // ---------- lock helpers ----------

  async getLock(houseId: string, month: string) {
    return (this.prisma as any).mealSheetLock.findUnique({
      where: { houseId_month: { houseId, month } },
      include: {
        lockedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async assertNotLocked(houseId: string, month: string) {
    const lock = await this.getLock(houseId, month);
    if (lock) throw new ForbiddenException('Month is locked');
  }

  private toStatusResponse(month: string, lock: any) {
    return {
      month,
      locked: !!lock,
      lockedAt: lock?.lockedAt ?? null,
      lockedBy: lock?.lockedBy ?? null,
    };
  }

  // ---------- membership ----------

  private async getMember(userId: string, houseId: string) {
    return this.prisma.houseMember.findFirst({
      where: { userId, houseId, isActive: true },
      select: { joinDate: true },
    });
  }

  private normalizeJoinDate(joinDate: Date): Date {
    return new Date(
      Date.UTC(
        joinDate.getUTCFullYear(),
        joinDate.getUTCMonth(),
        joinDate.getUTCDate(),
      ),
    );
  }

  // ---------- GRID ----------

  async getGrid(houseId: string, query: MealSheetMonthQueryDto) {
    const { month } = query;
    const { start, end } = this.getMonthRange(month);
    const today = this.getTodayUTC();
    const pastDeadline = this.isPastDeadline();

    const [members, mealLogs, lock] = await Promise.all([
      this.prisma.houseMember.findMany({
        where: { houseId, isActive: true },
        select: {
          userId: true,
          joinDate: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.mealLog.findMany({
        where: { houseId, date: { gte: start, lte: end } },
      }),
      this.getLock(houseId, month),
    ]);

    const allDates = this.getDatesInRange(start, end);

    // Per-member rows
    const rows = members.map((m) => {
      const join = this.normalizeJoinDate(m.joinDate);
      const memberLogs = new Map(
        mealLogs
          .filter((l) => l.userId === m.userId)
          .map((l) => [this.toDateKey(new Date(l.date)), l]),
      );

      let totalLunch = 0,
        totalDinner = 0,
        totalGuestLunch = 0,
        totalGuestDinner = 0,
        totalMeals = 0;

      const cells = allDates.map((date) => {
        const beforeJoin = date < join;
        if (beforeJoin) {
          return {
            date: this.toDateKey(date),
            lunch: 0,
            dinner: 0,
            guestLunch: 0,
            guestDinner: 0,
            total: 0,
            isVirtual: true,
            beforeJoin: true,
          };
        }

        const key = this.toDateKey(date);
        const log = memberLogs.get(key);
        const lunch = log ? Number(log.lunch) : 1;
        const dinner = log ? Number(log.dinner) : 1;
        const guestLunch = log ? log.guestLunch : 0;
        const guestDinner = log ? log.guestDinner : 0;
        const total = lunch + dinner + guestLunch + guestDinner;

        totalLunch += lunch;
        totalDinner += dinner;
        totalGuestLunch += guestLunch;
        totalGuestDinner += guestDinner;
        totalMeals += total;

        return {
          date: key,
          lunch,
          dinner,
          guestLunch,
          guestDinner,
          total,
          isVirtual: !log,
          beforeJoin: false,
        };
      });

      return {
        userId: m.userId,
        user: m.user,
        joinDate: m.joinDate,
        cells,
        rowTotal: {
          totalLunch,
          totalDinner,
          totalGuestLunch,
          totalGuestDinner,
          totalMeals,
        },
      };
    });

    // Day columns
    const days = allDates.map((date) => {
      const key = this.toDateKey(date);
      let columnTotal = 0;
      let columnGuestTotal = 0;
      for (const row of rows) {
        const c = row.cells.find((cell) => cell.date === key)!;
        columnTotal += c.total;
        columnGuestTotal += c.guestLunch + c.guestDinner;
      }

      let editable = true;
      let lockReason: string | null = null;
      if (lock) {
        editable = false;
        lockReason = 'Month is locked';
      } else if (date < today) {
        editable = false;
        lockReason = 'Past day — locked';
      } else if (date.getTime() === today.getTime() && pastDeadline) {
        editable = false;
        lockReason = 'Deadline passed (10:00 AM)';
      }

      return { date: key, editable, lockReason, columnTotal, columnGuestTotal };
    });

    // Summary
    const totalMeals = rows.reduce((s, r) => s + r.rowTotal.totalMeals, 0);
    const totalGuestMeals = rows.reduce(
      (s, r) => s + r.rowTotal.totalGuestLunch + r.rowTotal.totalGuestDinner,
      0,
    );

    return {
      month,
      locked: !!lock,
      lockedAt: lock?.lockedAt ?? null,
      lockedBy: lock?.lockedBy ?? null,
      days,
      rows,
      summary: {
        totalMeals,
        totalGuestMeals,
        activeMembers: members.length,
        totalDaysInMonth: allDates.length,
      },
    };
  }

  // ---------- STATUS ----------

  async getStatus(houseId: string, query: MealSheetMonthQueryDto) {
    const lock = await this.getLock(houseId, query.month);
    return this.toStatusResponse(query.month, lock);
  }

  // ---------- LOCK / UNLOCK ----------

  async lockMonth(houseId: string, userId: string, dto: LockMonthDto) {
    const existing = await this.getLock(houseId, dto.month);
    if (existing) throw new ConflictException('Month is already locked');

    await (this.prisma as any).mealSheetLock.create({
      data: { houseId, month: dto.month, lockedById: userId },
    });

    const lock = await this.getLock(houseId, dto.month);
    return this.toStatusResponse(dto.month, lock);
  }

  async unlockMonth(houseId: string, dto: LockMonthDto) {
    const existing = await this.getLock(houseId, dto.month);
    if (!existing) throw new ConflictException('Month is not locked');

    await (this.prisma as any).mealSheetLock.delete({
      where: { houseId_month: { houseId, month: dto.month } },
    });

    return this.toStatusResponse(dto.month, null);
  }

  // ---------- CELL UPDATE ----------

  async updateCell(houseId: string, managerId: string, dto: UpdateCellDto) {
    const mealDate = this.parseDate(dto.date);
    const month = this.toMonthKey(mealDate);
    await this.assertNotLocked(houseId, month);

    const member = await this.getMember(dto.userId, houseId);
    if (!member) throw new NotFoundException('User not in this house');

    const join = this.normalizeJoinDate(member.joinDate);
    if (mealDate < join) {
      throw new ForbiddenException('Date is before the user joined');
    }

    if (!dto.force) {
      const today = this.getTodayUTC();
      if (mealDate < today) {
        throw new ForbiddenException('Cannot update past meal logs without force');
      }
      if (mealDate.getTime() === today.getTime() && this.isPastDeadline()) {
        throw new ForbiddenException('Meal update deadline passed (10:00 AM)');
      }
    }

    return this.upsertCell(houseId, dto.userId, managerId, mealDate, {
      lunch: dto.lunch,
      dinner: dto.dinner,
      guestLunch: dto.guestLunch,
      guestDinner: dto.guestDinner,
    });
  }

  // ---------- BULK UPDATE ----------

  async bulkUpdate(houseId: string, managerId: string, dto: BulkUpdateSheetDto) {
    const today = this.getTodayUTC();
    const pastDeadline = this.isPastDeadline();

    // Preload memberships
    const userIds = Array.from(new Set(dto.cells.map((c) => c.userId)));
    const members = await this.prisma.houseMember.findMany({
      where: { userId: { in: userIds }, houseId, isActive: true },
      select: { userId: true, joinDate: true },
    });
    const memberMap = new Map(members.map((m) => [m.userId, m]));

    // Preload locks for affected months
    const monthsTouched = Array.from(
      new Set(dto.cells.map((c) => this.toMonthKey(this.parseDate(c.date)))),
    );
    const locks = await (this.prisma as any).mealSheetLock.findMany({
      where: { houseId, month: { in: monthsTouched } },
      select: { month: true },
    });
    const lockedMonths = new Set(locks.map((l) => l.month));

    const updated: any[] = [];
    const skipped: { userId: string; date: string; reason: SkipReason }[] = [];

    for (const cell of dto.cells) {
      const mealDate = this.parseDate(cell.date);
      const month = this.toMonthKey(mealDate);

      if (lockedMonths.has(month)) {
        skipped.push({ userId: cell.userId, date: cell.date, reason: 'MONTH_LOCKED' });
        continue;
      }

      const member = memberMap.get(cell.userId);
      if (!member) {
        skipped.push({ userId: cell.userId, date: cell.date, reason: 'USER_NOT_IN_HOUSE' });
        continue;
      }

      const join = this.normalizeJoinDate(member.joinDate);
      if (mealDate < join) {
        skipped.push({ userId: cell.userId, date: cell.date, reason: 'BEFORE_JOIN_DATE' });
        continue;
      }

      if (!dto.force) {
        if (mealDate < today) {
          skipped.push({ userId: cell.userId, date: cell.date, reason: 'PAST_DAY' });
          continue;
        }
        if (mealDate.getTime() === today.getTime() && pastDeadline) {
          skipped.push({ userId: cell.userId, date: cell.date, reason: 'DEADLINE_PASSED' });
          continue;
        }
      }

      const result = await this.upsertCell(houseId, cell.userId, managerId, mealDate, {
        lunch: cell.lunch,
        dinner: cell.dinner,
        guestLunch: cell.guestLunch,
        guestDinner: cell.guestDinner,
      });
      updated.push(result);
    }

    return { updated, skipped };
  }

  // ---------- CSV export ----------

  async exportSheet(houseId: string, query: MealSheetExportQueryDto) {
    const grid = await this.getGrid(houseId, { month: query.month });

    if (query.format === ExportFormat.PDF) {
      throw new ForbiddenException('PDF export is not yet implemented — use format=csv');
    }

    const header = 'date,memberName,lunch,dinner,guestLunch,guestDinner,total';
    const lines: string[] = [];
    for (const row of grid.rows) {
      const memberName = `${row.user.firstName} ${row.user.lastName}`;
      for (const cell of row.cells) {
        if (cell.beforeJoin) continue;
        lines.push(
          [
            cell.date,
            memberName,
            cell.lunch,
            cell.dinner,
            cell.guestLunch,
            cell.guestDinner,
            cell.total,
          ]
            .map((v) => {
              const s = String(v);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(','),
        );
      }
    }
    return [header, ...lines].join('\n');
  }

  // ---------- DAILY HEADCOUNT ----------

  async getDailyHeadcount(houseId: string) {
    const today = this.getTodayUTC();
    const dateKey = this.toDateKey(today);

    const [members, todayLogs] = await Promise.all([
      this.prisma.houseMember.findMany({
        where: { houseId, isActive: true },
        select: {
          userId: true,
          joinDate: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.mealLog.findMany({
        where: { houseId, date: today },
      }),
    ]);

    const logMap = new Map(todayLogs.map((l) => [l.userId, l]));

    let totalLunch = 0;
    let totalDinner = 0;
    let totalGuestLunch = 0;
    let totalGuestDinner = 0;

    const members_list = members.map((m) => {
      const join = this.normalizeJoinDate(m.joinDate);
      const notYetJoined = today < join;
      const log = logMap.get(m.userId);

      const lunch = notYetJoined ? 0 : log ? Number(log.lunch) : 1;
      const dinner = notYetJoined ? 0 : log ? Number(log.dinner) : 1;
      const guestLunch = notYetJoined ? 0 : log ? log.guestLunch : 0;
      const guestDinner = notYetJoined ? 0 : log ? log.guestDinner : 0;

      totalLunch += lunch;
      totalDinner += dinner;
      totalGuestLunch += guestLunch;
      totalGuestDinner += guestDinner;

      return {
        userId: m.userId,
        user: m.user,
        lunch,
        dinner,
        guestLunch,
        guestDinner,
        total: lunch + dinner + guestLunch + guestDinner,
        notYetJoined,
      };
    });

    return {
      date: dateKey,
      members: members_list,
      summary: {
        totalLunch,
        totalDinner,
        totalGuestLunch,
        totalGuestDinner,
        totalMeals: totalLunch + totalDinner + totalGuestLunch + totalGuestDinner,
      },
    };
  }

  // ---------- shared upsert ----------

  private async upsertCell(
    houseId: string,
    userId: string,
    managerId: string,
    mealDate: Date,
    patch: {
      lunch?: boolean;
      dinner?: boolean;
      guestLunch?: number;
      guestDinner?: number;
    },
  ) {
    const existing = await this.prisma.mealLog.findUnique({
      where: { houseId_userId_date: { houseId, userId, date: mealDate } },
    });

    const baseLunch = existing ? Number(existing.lunch) : 1;
    const baseDinner = existing ? Number(existing.dinner) : 1;
    const baseGuestLunch = existing ? existing.guestLunch : 0;
    const baseGuestDinner = existing ? existing.guestDinner : 0;

    const lunch = patch.lunch !== undefined ? (patch.lunch ? 1 : 0) : baseLunch;
    const dinner = patch.dinner !== undefined ? (patch.dinner ? 1 : 0) : baseDinner;
    const guestLunch = patch.guestLunch !== undefined ? patch.guestLunch : baseGuestLunch;
    const guestDinner = patch.guestDinner !== undefined ? patch.guestDinner : baseGuestDinner;
    const totalDay = lunch + dinner + guestLunch + guestDinner;

    const saved = await this.prisma.mealLog.upsert({
      where: { houseId_userId_date: { houseId, userId, date: mealDate } },
      update: { lunch, dinner, guestLunch, guestDinner, totalDay, updatedById: managerId },
      create: {
        houseId,
        userId,
        date: mealDate,
        lunch,
        dinner,
        guestLunch,
        guestDinner,
        totalDay,
        createdById: managerId,
      },
    });

    return {
      date: this.toDateKey(new Date(saved.date)),
      lunch: Number(saved.lunch),
      dinner: Number(saved.dinner),
      guestLunch: saved.guestLunch,
      guestDinner: saved.guestDinner,
      total: Number(saved.totalDay),
      isVirtual: false,
      beforeJoin: false,
    };
  }
}
