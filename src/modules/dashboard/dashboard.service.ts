import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- helpers ----------

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthRange(month: string) {
    const [year, mon] = month.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, mon - 1, 1)),
      end: new Date(Date.UTC(year, mon, 1)),
    };
  }

  private getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private toDateKey(date: Date): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private getDatesInRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current < end) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  // ---------- main dashboard ----------

  async getDashboard(houseId: string, month?: string) {
    const targetMonth = month ?? this.getCurrentMonth();
    const { start, end } = this.getMonthRange(targetMonth);
    const today = this.getTodayUTC();
    const todayEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));

    // ── fetch everything in parallel ──────────────────────────────────────────
    const [
      house,
      members,
      bazarExpenses,
      mealLogs,
      todayLogs,
      deposits,
      payouts,
      lockStatus,
      recentBazar,
      recentDeposits,
      recentPayouts,
      bazarByCategory,
    ] = await Promise.all([
      // house info
      this.prisma.house.findUnique({
        where: { id: houseId },
        select: {
          id: true,
          name: true,
          address: true,
          isMealSystemActive: true,
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // all active members with fixed costs
      this.prisma.houseMember.findMany({
        where: { houseId, isActive: true },
        select: {
          userId: true,
          joinDate: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          userFixedCost: {
            select: {
              roomRent: true,
              khalaBill: true,
              wifiBill: true,
              electricity: true,
              gasBill: true,
              waterBill: true,
              otherBill: true,
              totalFixedCost: true,
            },
          },
        },
      }),

      // month bazar expenses
      this.prisma.expense.findMany({
        where: { houseId, isBazar: true, expenseDate: { gte: start, lt: end } },
        select: { payerId: true, amount: true },
      }),

      // month meal logs
      this.prisma.mealLog.findMany({
        where: { houseId, date: { gte: start, lt: end } },
        select: { userId: true, date: true, lunch: true, dinner: true, guestLunch: true, guestDinner: true, totalDay: true },
      }),

      // today's meal logs
      this.prisma.mealLog.findMany({
        where: { houseId, date: { gte: today, lt: todayEnd } },
        select: { userId: true, lunch: true, dinner: true, guestLunch: true, guestDinner: true, totalDay: true },
      }),

      // month deposits
      this.prisma.deposit.findMany({
        where: { houseId, date: { gte: start, lt: end } },
        select: { userId: true, amount: true },
      }),

      // month payouts (transactions)
      (this.prisma.transaction as any).findMany({
        where: { houseId, type: 'DEDUCTION', month: targetMonth },
        select: { userId: true, amount: true, category: true, description: true },
      }) as Promise<any[]>,

      // lock status for this month
      (this.prisma as any).mealSheetLock.findUnique({
        where: { houseId_month: { houseId, month: targetMonth } },
        select: { lockedAt: true, lockedBy: { select: { firstName: true, lastName: true } } },
      }),

      // recent 5 bazar entries
      this.prisma.expense.findMany({
        where: { houseId, isBazar: true },
        orderBy: { expenseDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          amount: true,
          expenseDate: true,
          payer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // recent 5 deposits
      this.prisma.deposit.findMany({
        where: { houseId },
        orderBy: { date: 'desc' },
        take: 5,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),

      // recent 5 payouts
      (this.prisma.transaction as any).findMany({
        where: { houseId, type: 'DEDUCTION' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, description: true, amount: true, category: true, createdAt: true },
      }) as Promise<any[]>,

      // bazar by category for chart
      this.prisma.expense.groupBy({
        by: ['bazarCategory' as any],
        where: { houseId, isBazar: true, expenseDate: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: { _all: true },
      } as any) as Promise<any[]>,
    ]);

    // ── meal calculations ─────────────────────────────────────────────────────
    const allDates = this.getDatesInRange(start, end);
    const memberMealsMap = new Map<string, number>();
    let totalHouseMeals = 0;

    members.forEach((member) => {
      const joinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));
      let meals = 0;
      allDates.forEach((date) => {
        if (date < joinDate) return;
        const log = mealLogs.find(
          (l) => l.userId === member.userId && this.toDateKey(l.date) === this.toDateKey(date),
        );
        meals += log ? Number(log.totalDay) : 2;
      });
      memberMealsMap.set(member.userId, meals);
      totalHouseMeals += meals;
    });

    const totalBazarExpense = bazarExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const mealRate = totalHouseMeals > 0 ? totalBazarExpense / totalHouseMeals : 0;

    // ── contribution maps ─────────────────────────────────────────────────────
    const bazarContribMap = new Map<string, number>();
    bazarExpenses.forEach((e) => {
      bazarContribMap.set(e.payerId, (bazarContribMap.get(e.payerId) ?? 0) + Number(e.amount));
    });

    const depositMap = new Map<string, number>();
    deposits.forEach((d) => {
      depositMap.set(d.userId, (depositMap.get(d.userId) ?? 0) + Number(d.amount));
    });

    const refundMap = new Map<string, number>();
    payouts
      .filter((p: any) => p.category === 'MEMBER_REFUND')
      .forEach((p: any) => {
        refundMap.set(p.userId, (refundMap.get(p.userId) ?? 0) + Number(p.amount));
      });

    // ── per-member settlement ────────────────────────────────────────────────
    let totalMemberDues = 0;
    const memberDetails = members.map((member) => {
      const meals = memberMealsMap.get(member.userId) ?? 0;
      const mealCost = Math.round(meals * mealRate * 100) / 100;
      const fixedCost = Math.round(Number(member.userFixedCost?.totalFixedCost ?? 0) * 100) / 100;
      const totalDue = Math.round((mealCost + fixedCost) * 100) / 100;
      const bazarContrib = Math.round((bazarContribMap.get(member.userId) ?? 0) * 100) / 100;
      const deposited = Math.round((depositMap.get(member.userId) ?? 0) * 100) / 100;
      const refundReceived = Math.round((refundMap.get(member.userId) ?? 0) * 100) / 100;
      const totalPaid = Math.round((bazarContrib + deposited) * 100) / 100;
      const rawBalance = Math.round((totalDue - totalPaid) * 100) / 100;
      const balance = Math.round((rawBalance + refundReceived) * 100) / 100;
      totalMemberDues += totalDue;

      return {
        userId: member.userId,
        user: member.user,
        meals,
        mealCost,
        fixedCost,
        fixedCostBreakdown: member.userFixedCost
          ? {
              roomRent: Number(member.userFixedCost.roomRent),
              khalaBill: Number(member.userFixedCost.khalaBill),
              wifiBill: Number(member.userFixedCost.wifiBill),
              electricity: Number(member.userFixedCost.electricity),
              gasBill: Number(member.userFixedCost.gasBill),
              waterBill: Number(member.userFixedCost.waterBill),
              otherBill: Number(member.userFixedCost.otherBill),
            }
          : null,
        totalDue,
        bazarContribution: bazarContrib,
        deposits: deposited,
        refundReceived,
        totalPaid,
        balance,
        status: balance > 0.01 ? 'OWES' : balance < -0.01 ? 'GETS_REFUND' : 'SETTLED',
      };
    });

    // ── today headcount ───────────────────────────────────────────────────────
    let todayTotalLunch = 0;
    let todayTotalDinner = 0;
    let todayTotalGuestLunch = 0;
    let todayTotalGuestDinner = 0;

    members.forEach((member) => {
      const joinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));
      if (today < joinDate) return;

      const log = todayLogs.find((l) => l.userId === member.userId);
      todayTotalLunch += log ? Number(log.lunch) : 1;
      todayTotalDinner += log ? Number(log.dinner) : 1;
      todayTotalGuestLunch += log ? log.guestLunch : 0;
      todayTotalGuestDinner += log ? log.guestDinner : 0;
    });

    // ── financial summary ────────────────────────────────────────────────────
    const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
    const totalCollected = Math.round((totalBazarExpense + totalDeposits) * 100) / 100;
    const totalMemberRefunds = payouts
      .filter((p: any) => p.category === 'MEMBER_REFUND')
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const netCollected = Math.round((totalCollected - totalMemberRefunds) * 100) / 100;
    const totalHouseBills = payouts
      .filter((p: any) => p.category !== 'MEMBER_REFUND')
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalFixedCostsSum = members.reduce(
      (s, m) => s + Number(m.userFixedCost?.totalFixedCost ?? 0), 0,
    );
    const totalOutstanding = Math.round(
      memberDetails.reduce((s, m) => s + (m.balance > 0 ? m.balance : 0), 0) * 100,
    ) / 100;

    const settled = memberDetails.filter((m) => m.status === 'SETTLED').length;
    const owes = memberDetails.filter((m) => m.status === 'OWES').length;
    const getsRefund = memberDetails.filter((m) => m.status === 'GETS_REFUND').length;
    const isSettled = owes === 0 && getsRefund === 0;

    // ── daily chart data for the month ───────────────────────────────────────
    const dailyMealChart = allDates.map((date) => {
      const dateKey = this.toDateKey(date);
      let lunch = 0, dinner = 0, guestLunch = 0, guestDinner = 0;

      members.forEach((member) => {
        const joinDate = new Date(Date.UTC(
          member.joinDate.getUTCFullYear(),
          member.joinDate.getUTCMonth(),
          member.joinDate.getUTCDate(),
        ));
        if (date < joinDate) return;
        const log = mealLogs.find((l) => l.userId === member.userId && this.toDateKey(l.date) === dateKey);
        lunch += log ? Number(log.lunch) : 1;
        dinner += log ? Number(log.dinner) : 1;
        guestLunch += log ? log.guestLunch : 0;
        guestDinner += log ? log.guestDinner : 0;
      });

      return {
        date: dateKey,
        lunch,
        dinner,
        guestLunch,
        guestDinner,
        total: lunch + dinner + guestLunch + guestDinner,
      };
    });

    // ── bazar category chart ──────────────────────────────────────────────────
    const categoryChart = (bazarByCategory as any[])
      .filter((g) => g.bazarCategory !== null)
      .map((g) => ({
        category: g.bazarCategory,
        total: Math.round(Number(g._sum?.amount ?? 0) * 100) / 100,
        count: g._count?._all ?? 0,
        percentage: totalBazarExpense > 0
          ? Math.round((Number(g._sum?.amount ?? 0) / totalBazarExpense) * 10000) / 100
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── recent activity feed ──────────────────────────────────────────────────
    const activityFeed = [
      ...recentDeposits.map((d: any) => ({
        type: 'DEPOSIT',
        id: d.id,
        title: d.title ?? 'Deposit',
        amount: Number(d.amount),
        user: d.user,
        date: d.date,
      })),
      ...recentPayouts.map((p: any) => ({
        type: 'PAYOUT',
        id: p.id,
        title: p.description,
        category: p.category,
        amount: Number(p.amount),
        date: p.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    // ── assemble response ─────────────────────────────────────────────────────
    return {
      house: {
        ...house,
        totalActiveMembers: members.length,
      },

      today: {
        date: this.toDateKey(today),
        totalLunch: todayTotalLunch,
        totalDinner: todayTotalDinner,
        totalGuestLunch: todayTotalGuestLunch,
        totalGuestDinner: todayTotalGuestDinner,
        totalMeals: todayTotalLunch + todayTotalDinner + todayTotalGuestLunch + todayTotalGuestDinner,
        editDeadlinePassed: new Date().getUTCHours() >= 10,
      },

      currentMonth: {
        month: targetMonth,
        isLocked: !!lockStatus,
        lockedAt: lockStatus?.lockedAt ?? null,
        lockedBy: lockStatus?.lockedBy ?? null,
        mealRate: Math.round(mealRate * 100) / 100,
        totalHouseMeals,
        totalBazarExpense: Math.round(totalBazarExpense * 100) / 100,
        totalBazarEntries: bazarExpenses.length,
        totalFixedCosts: Math.round(totalFixedCostsSum * 100) / 100,
        totalDeposits: Math.round(totalDeposits * 100) / 100,
        totalCollected,
        netCollected,
        totalMemberDues: Math.round(totalMemberDues * 100) / 100,
        totalOutstanding,
        totalHouseBills: Math.round(totalHouseBills * 100) / 100,
        totalMemberRefunds: Math.round(totalMemberRefunds * 100) / 100,
        isSettled,
      },

      memberStats: {
        total: members.length,
        settled,
        owes,
        getsRefund,
      },

      members: memberDetails,

      charts: {
        dailyMeals: dailyMealChart,
        bazarByCategory: categoryChart,
      },

      recentBazar: recentBazar.map((b) => ({
        id: b.id,
        title: b.title,
        amount: Number(b.amount),
        expenseDate: this.toDateKey(b.expenseDate),
        payer: b.payer,
      })),

      recentActivity: activityFeed,
    };
  }
}
