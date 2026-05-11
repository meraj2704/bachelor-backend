import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  BulkUpdateMealDto,
  MealLogMonthQueryDto,
  MealLogRangeQueryDto,
  UpdateDayMealDto,
} from './dto/meal-log.dto.js';

@Injectable()
export class MealLogService {
  constructor(private prisma: PrismaService) {}

  // Parse "YYYY-MM-DD" to UTC midnight Date
  private parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private getMonthRange(month: string): { start: Date; end: Date } {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 0)); // last day of month
    return { start, end };
  }

  private makeVirtualLog(userId: string, houseId: string, date: Date) {
    return {
      id: null,
      houseId,
      userId,
      date,
      lunch: 1.0,
      dinner: 1.0,
      guestLunch: 0,
      guestDinner: 0,
      totalDay: 2.0,
      isVirtual: true,
      createdAt: null,
      updatedAt: null,
      createdById: null,
      updatedById: null,
    };
  }

  // Merge actual DB logs with virtual defaults for missing dates
  private fillMissingDays(
    userId: string,
    houseId: string,
    actualLogs: any[],
    allDates: Date[],
    joinDate: Date,
  ) {
    const logMap = new Map(actualLogs.map((log) => [this.toDateKey(new Date(log.date)), log]));

    return allDates
      .filter((date) => date >= joinDate)
      .map((date) => {
        const key = this.toDateKey(date);
        return logMap.has(key)
          ? { ...logMap.get(key), isVirtual: false }
          : this.makeVirtualLog(userId, houseId, date);
      });
  }

  private toMonthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async assertMonthNotLocked(houseId: string, date: Date) {
    const month = this.toMonthKey(date);
    const lock = await (this.prisma as any).mealSheetLock.findUnique({
      where: { houseId_month: { houseId, month } },
      select: { id: true },
    });
    if (lock) throw new ForbiddenException('Month is locked');
  }

  // PATCH /meal-logs/update-day
  async updateDay(userId: string, houseId: string, dto: UpdateDayMealDto) {
    const mealDate = this.parseDate(dto.date);
    const today = this.getTodayUTC();

    await this.assertMonthNotLocked(houseId, mealDate);

    if (mealDate < today) {
      throw new ForbiddenException('Cannot update past meal logs');
    }

    const now = new Date();
    const isPastCutoff = now.getUTCHours() >= 10; // 10:00 AM UTC cutoff
    if (mealDate.getTime() === today.getTime() && isPastCutoff) {
      throw new ForbiddenException('Meal update deadline passed (10:00 AM)');
    }

    const existing = await this.prisma.mealLog.findUnique({
      where: { houseId_userId_date: { houseId, userId, date: mealDate } },
    });

    // Fall back to defaults (1, 1, 0, 0) if no record exists
    const baseLunch = existing ? Number(existing.lunch) : 1;
    const baseDinner = existing ? Number(existing.dinner) : 1;
    const baseGuestLunch = existing ? existing.guestLunch : 0;
    const baseGuestDinner = existing ? existing.guestDinner : 0;

    const lunch = dto.lunch !== undefined ? (dto.lunch ? 1 : 0) : baseLunch;
    const dinner = dto.dinner !== undefined ? (dto.dinner ? 1 : 0) : baseDinner;
    const guestLunch = dto.guestLunch !== undefined ? dto.guestLunch : baseGuestLunch;
    const guestDinner = dto.guestDinner !== undefined ? dto.guestDinner : baseGuestDinner;
    const totalDay = lunch + dinner + guestLunch + guestDinner;

    return this.prisma.mealLog.upsert({
      where: { houseId_userId_date: { houseId, userId, date: mealDate } },
      update: { lunch, dinner, guestLunch, guestDinner, totalDay, updatedById: userId },
      create: { houseId, userId, date: mealDate, lunch, dinner, guestLunch, guestDinner, totalDay, createdById: userId },
    });
  }

  // POST /meal-logs/bulk-update
  async bulkUpdate(userId: string, houseId: string, dto: BulkUpdateMealDto) {
    const today = this.getTodayUTC();
    const now = new Date();
    const isPastCutoff = now.getUTCHours() >= 10;

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      // Pre-fetch locked months for any month touched by this bulk write
      const monthsTouched = Array.from(
        new Set(dto.meals.map((m) => this.toMonthKey(this.parseDate(m.date)))),
      );
      const locks: { month: string }[] = await (tx as any).mealSheetLock.findMany({
        where: { houseId, month: { in: monthsTouched } },
        select: { month: true },
      });
      const lockedMonths = new Set(locks.map((l) => l.month));

      for (const meal of dto.meals) {
        const mealDate = this.parseDate(meal.date);

        if (lockedMonths.has(this.toMonthKey(mealDate))) continue;
        if (mealDate < today) continue;
        if (mealDate.getTime() === today.getTime() && isPastCutoff) continue;

        const lunch = meal.lunch ? 1 : 0;
        const dinner = meal.dinner ? 1 : 0;
        const totalDay = lunch + dinner + meal.guestLunch + meal.guestDinner;

        const upserted = await tx.mealLog.upsert({
          where: { houseId_userId_date: { houseId, userId, date: mealDate } },
          update: { lunch, dinner, guestLunch: meal.guestLunch, guestDinner: meal.guestDinner, totalDay, updatedById: userId },
          create: { houseId, userId, date: mealDate, lunch, dinner, guestLunch: meal.guestLunch, guestDinner: meal.guestDinner, totalDay, createdById: userId },
        });
        results.push(upserted);
      }

      return results;
    });
  }

  // GET /meal-logs/my-logs — fills virtual defaults for missing dates
  async getMyLogs(userId: string, houseId: string, query: MealLogRangeQueryDto) {
    const start = this.parseDate(query.startDate);
    const end = this.parseDate(query.endDate);

    const [actualLogs, member] = await Promise.all([
      this.prisma.mealLog.findMany({
        where: { userId, houseId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.houseMember.findFirst({
        where: { userId, houseId },
        select: { joinDate: true },
      }),
    ]);

    const joinDate = member?.joinDate
      ? new Date(Date.UTC(
          member.joinDate.getUTCFullYear(),
          member.joinDate.getUTCMonth(),
          member.joinDate.getUTCDate(),
        ))
      : start;

    const effectiveStart = joinDate > start ? joinDate : start;
    const allDates = this.getDatesInRange(effectiveStart, end);
    return this.fillMissingDays(userId, houseId, actualLogs, allDates, joinDate);
  }

  // GET /meal-logs/house-logs — all members for a month (manager view)
  async getHouseLogs(houseId: string, query: MealLogMonthQueryDto) {
    const { start, end } = this.getMonthRange(query.month);

    const [members, allMealLogs] = await Promise.all([
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
    ]);

    const allDates = this.getDatesInRange(start, end);

    return members.map((member) => {
      const joinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));
      const memberLogs = allMealLogs.filter((l) => l.userId === member.userId);
      const effectiveStart = joinDate > start ? joinDate : start;
      const effectiveDates = allDates.filter((d) => d >= effectiveStart);
      const filledLogs = this.fillMissingDays(member.userId, houseId, memberLogs, effectiveDates, joinDate);

      return {
        userId: member.userId,
        user: member.user,
        logs: filledLogs,
      };
    });
  }

  // GET /meal-logs/monthly-summary — totals per member for a month
  async getMonthlySummary(houseId: string, query: MealLogMonthQueryDto) {
    const { start, end } = this.getMonthRange(query.month);
    const today = this.getTodayUTC();
    const effectiveEnd = end > today ? today : end;

    const [members, allMealLogs] = await Promise.all([
      this.prisma.houseMember.findMany({
        where: { houseId, isActive: true },
        select: {
          userId: true,
          joinDate: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.mealLog.findMany({
        where: { houseId, date: { gte: start, lte: effectiveEnd } },
      }),
    ]);

    const allDates = this.getDatesInRange(start, effectiveEnd);

    return members.map((member) => {
      const joinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));
      const memberLogs = allMealLogs.filter((l) => l.userId === member.userId);
      const effectiveStart = joinDate > start ? joinDate : start;
      const effectiveDates = allDates.filter((d) => d >= effectiveStart);
      const filledLogs = this.fillMissingDays(member.userId, houseId, memberLogs, effectiveDates, joinDate);

      const totalLunch = filledLogs.reduce((sum, l) => sum + Number(l.lunch), 0);
      const totalDinner = filledLogs.reduce((sum, l) => sum + Number(l.dinner), 0);
      const totalGuestLunch = filledLogs.reduce((sum, l) => sum + Number(l.guestLunch), 0);
      const totalGuestDinner = filledLogs.reduce((sum, l) => sum + Number(l.guestDinner), 0);
      const totalMeals = filledLogs.reduce((sum, l) => sum + Number(l.totalDay), 0);

      return {
        userId: member.userId,
        user: member.user,
        totalLunch,
        totalDinner,
        totalGuestLunch,
        totalGuestDinner,
        totalMeals,
      };
    });
  }
}
