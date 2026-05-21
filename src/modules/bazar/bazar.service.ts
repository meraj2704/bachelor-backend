import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateBazarDto } from './dto/create-bazar.dto.js';
import {
  QueryBazarDto,
  BazarSortBy,
  BazarSortOrder,
  MonthlySummaryQueryDto,
  MonthlySettlementQueryDto,
} from './dto/query-bazar.dto.js';
import { UpdateBazarDto } from './dto/update-bazar.dto.js';
import { BazarCategory } from './bazar.enums.js';

type BazarEntry = {
  id: string;
  houseId: string;
  title: string;
  amount: any;
  quantity: any;
  unit: any;
  category: BazarCategory | null;
  expenseDate: Date;
  payerId: string;
  payer: { id: string; firstName: string; lastName: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class BazarService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- helpers ----------

  private toBazarEntry(e: any): BazarEntry {
    return {
      id: e.id,
      houseId: e.houseId,
      title: e.title,
      amount: e.amount,
      quantity: e.quantity ?? null,
      unit: e.unit ?? null,
      category: (e.bazarCategory ?? null) as BazarCategory | null,
      expenseDate: e.expenseDate,
      payerId: e.payerId,
      payer: e.payer
        ? { id: e.payer.id, firstName: e.payer.firstName, lastName: e.payer.lastName }
        : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private getMonthDateRange(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 1));
    return { gte: startDate, lt: endDate };
  }

  private async getEntryForAuth(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { house: { select: { managerId: true } } },
    });
    if (!expense || !expense.isBazar) {
      throw new NotFoundException('Bazar entry not found');
    }
    return expense;
  }

  private assertCanMutate(expense: any, userId: string, userHouseId: string) {
    if (expense.houseId !== userHouseId) {
      throw new NotFoundException('Bazar entry not found');
    }
    const isPayer = expense.payerId === userId;
    const isManager = expense.house?.managerId === userId;
    if (!isPayer && !isManager) {
      throw new ForbiddenException(
        'Only the payer or the house manager can modify this entry',
      );
    }
  }

  private buildListWhere(
    base: Record<string, any>,
    query: QueryBazarDto,
  ): Record<string, any> {
    const { month, search, category, payerId } = query;
    return {
      ...base,
      isBazar: true,
      expenseDate: this.getMonthDateRange(month),
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
      ...(category && { bazarCategory: category }),
      ...(payerId && { payerId }),
    };
  }

  private buildOrderBy(query: QueryBazarDto) {
    const sortBy = query.sortBy ?? BazarSortBy.EXPENSE_DATE;
    const order = query.order ?? BazarSortOrder.DESC;
    return { [sortBy]: order };
  }

  // ---------- create ----------

  async create(dto: CreateBazarDto, houseId: string, creatorId: string) {
    if (dto.quantity !== undefined && !dto.unit) {
      throw new BadRequestException('unit is required when quantity is provided');
    }

    const payerId = creatorId;

    const created = await this.prisma.expense.create({
      data: {
        title: dto.title,
        amount: dto.amount.toString(),
        expenseDate: new Date(dto.expenseDate),
        quantity: dto.quantity !== undefined ? dto.quantity.toString() : null,
        unit: dto.unit ?? null,
        bazarCategory: dto.category,
        houseId,
        payerId,
        createdById: creatorId,
        isBazar: true,
        isFixedCost: false,
        category: 'MEAL_BAZAR',
      } as any,
      include: {
        payer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.toBazarEntry(created);
  }

  // ---------- list ----------

  async findAll(houseId: string, query: QueryBazarDto) {
    return this.listEntries({ houseId }, query);
  }

  async findAllForMe(userId: string, houseId: string, query: QueryBazarDto) {
    return this.listEntries({ houseId, payerId: userId }, query);
  }

  private async listEntries(base: Record<string, any>, query: QueryBazarDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(base, query);

    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(query),
        include: {
          payer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toBazarEntry(r)),
      meta: {
        total,
        page,
        limit,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // ---------- monthly summary ----------

  async monthlySummary(
    houseId: string,
    userId: string,
    query: MonthlySummaryQueryDto,
  ) {
    const where: Record<string, any> = {
      houseId,
      isBazar: true,
      expenseDate: this.getMonthDateRange(query.month),
    };
    if (query.scope === 'me') where.payerId = userId;

    const [agg, grouped] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.groupBy({
        by: ['bazarCategory' as any],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      } as any) as Promise<any[]>,
    ]);

    const total = Number(agg._sum.amount ?? 0);
    const count = agg._count._all;
    const average = count > 0 ? Math.round(total / count) : 0;

    const byCategory = (grouped as any[])
      .filter((g) => g.bazarCategory !== null)
      .map((g) => ({
        category: g.bazarCategory as BazarCategory,
        total: Number(g._sum?.amount ?? 0),
        count: g._count?._all ?? 0,
      }))
      .sort((a, b) => b.total - a.total);

    const topCategory = byCategory.length > 0 ? byCategory[0].category : null;

    return { total, count, average, topCategory, byCategory };
  }

  // ---------- update ----------

  async update(
    id: string,
    dto: UpdateBazarDto,
    userId: string,
    userHouseId: string,
  ) {
    const existing = await this.getEntryForAuth(id);
    this.assertCanMutate(existing, userId, userHouseId);

    const data: Record<string, any> = { updatedById: userId };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.amount !== undefined) data.amount = dto.amount.toString();
    if (dto.quantity !== undefined)
      data.quantity = dto.quantity === null ? null : dto.quantity.toString();
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.category !== undefined) data.bazarCategory = dto.category;
    if (dto.expenseDate !== undefined)
      data.expenseDate = new Date(dto.expenseDate);

    const updated = await this.prisma.expense.update({
      where: { id },
      data,
      include: {
        payer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.toBazarEntry(updated);
  }

  // ---------- remove ----------

  async remove(id: string, userId: string, userHouseId: string) {
    const existing = await this.getEntryForAuth(id);
    this.assertCanMutate(existing, userId, userHouseId);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true, id };
  }

  // ---------- CSV export ----------

  async exportCsv(
    houseId: string,
    userId: string,
    query: QueryBazarDto & { scope?: 'house' | 'me' },
  ) {
    const base: Record<string, any> =
      query.scope === 'me' ? { houseId, payerId: userId } : { houseId };
    const where = this.buildListWhere(base, query);

    const rows = await this.prisma.expense.findMany({
      where,
      orderBy: this.buildOrderBy(query),
      include: {
        payer: { select: { firstName: true, lastName: true } },
      },
    });

    const header = 'id,date,title,quantity,unit,category,amount,payerName';
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = rows.map((r: any) =>
      [
        r.id,
        r.expenseDate.toISOString().split('T')[0],
        r.title,
        r.quantity ?? '',
        r.unit ?? '',
        r.bazarCategory ?? '',
        r.amount,
        r.payer ? `${r.payer.firstName} ${r.payer.lastName}` : '',
      ]
        .map(escape)
        .join(','),
    );

    return [header, ...lines].join('\n');
  }

  // ---------- monthly settlement ----------

  private getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current < end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private toDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async monthlySettlement(houseId: string, query: MonthlySettlementQueryDto) {
    const { gte: startDate, lt: endDate } = this.getMonthDateRange(query.month);

    const [members, allExpenses, fixedCosts, mealLogs] = await Promise.all([
      this.prisma.houseMember.findMany({
        where: { houseId, isActive: true },
        select: {
          userId: true,
          joinDate: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          houseId,
          isBazar: true,
          expenseDate: { gte: startDate, lt: endDate },
        },
        select: { id: true, payerId: true, amount: true },
      }),
      this.prisma.userFixedCost.findMany({
        where: { houseId },
        select: {
          memberId: true,
          totalFixedCost: true,
        },
      }),
      this.prisma.mealLog.findMany({
        where: {
          houseId,
          date: { gte: startDate, lt: endDate },
        },
        select: { userId: true, date: true, totalDay: true },
      }),
    ]);

    const totalBazarExpense = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const fixedCostMap = new Map(fixedCosts.map((f) => [f.memberId, Number(f.totalFixedCost)]));
    const contributionMap = new Map<string, number>();
    allExpenses.forEach((e) => {
      const current = contributionMap.get(e.payerId) || 0;
      contributionMap.set(e.payerId, current + Number(e.amount));
    });

    // Calculate meals including virtual defaults (lunch=1, dinner=1 for missing dates)
    const allDates = this.getDatesInRange(startDate, endDate);
    const memberMealsMap = new Map<string, number>();
    let totalMeals = 0;

    members.forEach((member) => {
      let memberTotalMeals = 0;
      const memberJoinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));

      allDates.forEach((date) => {
        if (date < memberJoinDate) return;

        const actualLog = mealLogs.find(
          (m) => m.userId === member.userId && this.toDateKey(new Date(m.date)) === this.toDateKey(date),
        );

        if (actualLog) {
          memberTotalMeals += Number(actualLog.totalDay);
        } else {
          memberTotalMeals += 2; // Virtual default: lunch=1, dinner=1
        }
      });

      memberMealsMap.set(member.userId, memberTotalMeals);
      totalMeals += memberTotalMeals;
    });

    const mealRate = totalMeals > 0 ? totalBazarExpense / totalMeals : 0;

    const memberDetails = members.map((member) => {
      const fixedCost = fixedCostMap.get(member.userId) || 0;
      const contribution = contributionMap.get(member.userId) || 0;
      const memberMeals = memberMealsMap.get(member.userId) || 0;
      const bazarAmount = memberMeals * mealRate;
      const totalOwed = bazarAmount + fixedCost;
      const balance = totalOwed - contribution;

      let status: 'OWES' | 'GETS_REFUND' | 'SETTLED';
      if (balance > 0.01) status = 'OWES';
      else if (balance < -0.01) status = 'GETS_REFUND';
      else status = 'SETTLED';

      return {
        userId: member.userId,
        user: member.user,
        joinDate: member.joinDate,
        totalMeals: memberMeals,
        mealRate: Math.round(mealRate * 100) / 100,
        bazarAmount: Math.round(bazarAmount * 100) / 100,
        fixedCost: Math.round(fixedCost * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        yourContribution: Math.round(contribution * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        status,
      };
    });

    const totalFixedCosts = members.reduce((sum, m) => sum + (fixedCostMap.get(m.userId) || 0), 0);

    return {
      month: query.month,
      mealRate: Math.round(mealRate * 100) / 100,
      totalMeals,
      members: memberDetails,
      summary: {
        totalBazarExpense: Math.round(totalBazarExpense * 100) / 100,
        totalFixedCost: Math.round(totalFixedCosts * 100) / 100,
        totalOwed: Math.round((totalBazarExpense + totalFixedCosts) * 100) / 100,
        totalCollected: Math.round(
          allExpenses.reduce((sum, e) => sum + Number(e.amount), 0) * 100,
        ) / 100,
        activeMembers: members.length,
      },
    };
  }
}
