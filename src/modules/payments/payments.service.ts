import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';
import { CreatePayoutDto } from './dto/create-payout.dto.js';
import { PayoutCategory } from './payments.enums.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- helpers ----------

  private getMonthRange(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));
    return { start, end };
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

  // ---------- add deposit ----------

  async addDeposit(houseId: string, dto: CreateDepositDto, creatorId: string) {
    const member = await this.prisma.houseMember.findFirst({
      where: { houseId, userId: dto.from },
      select: {
        userId: true,
        joinDate: true,
        userFixedCost: { select: { totalFixedCost: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found in this house');

    // --- calculate outstanding balance for the month ---
    const { start, end } = this.getMonthRange(dto.month);

    const [bazarExpenses, mealLogs, existingDeposits] = await Promise.all([
      this.prisma.expense.findMany({
        where: { houseId, isBazar: true, expenseDate: { gte: start, lt: end } },
        select: { payerId: true, amount: true },
      }),
      this.prisma.mealLog.findMany({
        where: { houseId, date: { gte: start, lt: end } },
        select: { userId: true, date: true, totalDay: true },
      }),
      this.prisma.deposit.findMany({
        where: { houseId, userId: dto.from, date: { gte: start, lt: end } },
        select: { amount: true },
      }),
    ]);

    // meal rate
    const allDates = this.getDatesInRange(start, end);
    const joinDate = new Date(Date.UTC(
      member.joinDate.getUTCFullYear(),
      member.joinDate.getUTCMonth(),
      member.joinDate.getUTCDate(),
    ));

    let memberMeals = 0;
    let totalHouseMeals = 0;

    // get all house members to calculate total meals accurately
    const allMembers = await this.prisma.houseMember.findMany({
      where: { houseId, isActive: true },
      select: { userId: true, joinDate: true },
    });

    allMembers.forEach((m) => {
      const mJoinDate = new Date(Date.UTC(
        m.joinDate.getUTCFullYear(),
        m.joinDate.getUTCMonth(),
        m.joinDate.getUTCDate(),
      ));
      let meals = 0;
      allDates.forEach((date) => {
        if (date < mJoinDate) return;
        const log = mealLogs.find(
          (l) => l.userId === m.userId && this.toDateKey(l.date) === this.toDateKey(date),
        );
        meals += log ? Number(log.totalDay) : 2;
      });
      totalHouseMeals += meals;
      if (m.userId === dto.from) memberMeals = meals;
    });

    const totalBazarExpense = bazarExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const mealRate = totalHouseMeals > 0 ? totalBazarExpense / totalHouseMeals : 0;

    const mealCost = memberMeals * mealRate;
    const fixedCost = Number(member.userFixedCost?.totalFixedCost ?? 0);
    const totalDue = mealCost + fixedCost;

    const bazarContrib = bazarExpenses
      .filter((e) => e.payerId === dto.from)
      .reduce((s, e) => s + Number(e.amount), 0);
    const alreadyDeposited = existingDeposits.reduce((s, d) => s + Number(d.amount), 0);
    const totalPaid = bazarContrib + alreadyDeposited;

    const outstandingBalance = Math.round((totalDue - totalPaid) * 100) / 100;

    if (outstandingBalance <= 0) {
      throw new BadRequestException(
        `This member has no outstanding balance for ${dto.month}. They have already paid in full.`,
      );
    }

    if (dto.amount > outstandingBalance + 0.01) {
      throw new BadRequestException(
        `Deposit amount (${dto.amount}) exceeds outstanding balance (${outstandingBalance}) for ${dto.month}.`,
      );
    }

    // --- create deposit ---
    const deposit = await this.prisma.deposit.create({
      data: {
        houseId,
        userId: dto.from,
        title: dto.title,
        amount: dto.amount.toString(),
        createdById: creatorId,
      } as any,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const remainingAfter = Math.round((outstandingBalance - dto.amount) * 100) / 100;

    return {
      id: deposit.id,
      title: (deposit as any).title,
      from: deposit.user,
      amount: Number(deposit.amount),
      date: deposit.date,
      month: dto.month,
      outstandingBefore: outstandingBalance,
      remainingAfter,
    };
  }

  // ---------- record payout ----------

  async recordPayout(houseId: string, dto: CreatePayoutDto, creatorId: string) {
    // For MEMBER_REFUND, validate the member exists
    if (dto.category === PayoutCategory.MEMBER_REFUND) {
      if (!dto.to) throw new BadRequestException('`to` is required for MEMBER_REFUND');
      const member = await this.prisma.houseMember.findFirst({
        where: { houseId, userId: dto.to },
      });
      if (!member) throw new NotFoundException('Member not found in this house');
    }

    // For house bills, userId = manager who recorded it; for refunds, userId = recipient
    const userId = dto.category === PayoutCategory.MEMBER_REFUND ? dto.to! : creatorId;

    const transaction = await this.prisma.transaction.create({
      data: {
        houseId,
        userId,
        amount: dto.amount.toString(),
        type: 'DEDUCTION',
        category: dto.category,
        month: dto.month ?? null,
        description: dto.title,
        createdById: creatorId,
      } as any,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      id: transaction.id,
      title: dto.title,
      category: dto.category,
      to: dto.category === PayoutCategory.MEMBER_REFUND ? transaction.user : null,
      amount: Number(transaction.amount),
      month: dto.month ?? null,
      createdAt: transaction.createdAt,
    };
  }

  // ---------- list deposits ----------

  async getDeposits(houseId: string, month?: string, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    const where: any = { houseId };
    if (month) {
      const { start, end } = this.getMonthRange(month);
      where.date = { gte: start, lt: end };
    }

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return {
      data: deposits.map((d) => ({
        id: d.id,
        title: (d as any).title,
        from: d.user,
        amount: Number(d.amount),
        date: d.date,
      })),
      meta: { total, page, limit, lastPage: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // ---------- list payouts ----------

  async getPayouts(houseId: string, month?: string, limit = 50, page = 1) {
    const skip = (page - 1) * limit;
    const where: any = { houseId, type: 'DEDUCTION' };
    if (month) where.month = month;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t: any) => ({
        id: t.id,
        title: t.description,
        category: t.category ?? null,
        to: t.category === PayoutCategory.MEMBER_REFUND ? t.user : null,
        amount: Number(t.amount),
        month: t.month ?? null,
        createdAt: t.createdAt,
      })),
      meta: { total, page, limit, lastPage: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // ---------- settlement summary ----------

  async getSettlement(houseId: string, month: string) {
    const { start, end } = this.getMonthRange(month);

    const [members, bazarExpenses, mealLogs, deposits, payouts] =
      await Promise.all([
        this.prisma.houseMember.findMany({
          where: { houseId, isActive: true },
          select: {
            userId: true,
            joinDate: true,
            user: { select: { id: true, firstName: true, lastName: true } },
            userFixedCost: { select: { totalFixedCost: true } },
          },
        }),
        this.prisma.expense.findMany({
          where: { houseId, isBazar: true, expenseDate: { gte: start, lt: end } },
          select: { payerId: true, amount: true },
        }),
        this.prisma.mealLog.findMany({
          where: { houseId, date: { gte: start, lt: end } },
          select: { userId: true, date: true, totalDay: true },
        }),
        this.prisma.deposit.findMany({
          where: { houseId, date: { gte: start, lt: end } },
          select: { userId: true, amount: true },
        }),
        (this.prisma.transaction as any).findMany({
          where: { houseId, type: 'DEDUCTION', month },
          select: { userId: true, amount: true, category: true, description: true, createdAt: true },
        }) as Promise<any[]>,
      ]);

    // --- meal rate calculation (with virtual defaults) ---
    const allDates = this.getDatesInRange(start, end);
    const memberMealsMap = new Map<string, number>();
    let totalHouseMeals = 0;

    members.forEach((member) => {
      let memberMeals = 0;
      const joinDate = new Date(Date.UTC(
        member.joinDate.getUTCFullYear(),
        member.joinDate.getUTCMonth(),
        member.joinDate.getUTCDate(),
      ));

      allDates.forEach((date) => {
        if (date < joinDate) return;
        const log = mealLogs.find(
          (m) => m.userId === member.userId && this.toDateKey(m.date) === this.toDateKey(date),
        );
        memberMeals += log ? Number(log.totalDay) : 2;
      });

      memberMealsMap.set(member.userId, memberMeals);
      totalHouseMeals += memberMeals;
    });

    const totalBazarExpense = bazarExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const mealRate = totalHouseMeals > 0 ? totalBazarExpense / totalHouseMeals : 0;

    // --- per member contribution maps ---
    const bazarContribMap = new Map<string, number>();
    bazarExpenses.forEach((e) => {
      bazarContribMap.set(e.payerId, (bazarContribMap.get(e.payerId) ?? 0) + Number(e.amount));
    });

    const depositMap = new Map<string, number>();
    deposits.forEach((d) => {
      depositMap.set(d.userId, (depositMap.get(d.userId) ?? 0) + Number(d.amount));
    });

    // refunds paid out to each member — reduces their negative balance
    const refundMap = new Map<string, number>();
    payouts
      .filter((p: any) => p.category === PayoutCategory.MEMBER_REFUND)
      .forEach((p: any) => {
        refundMap.set(p.userId, (refundMap.get(p.userId) ?? 0) + Number(p.amount));
      });

    // --- member breakdown ---
    let totalMemberDues = 0;
    const memberBreakdown = members.map((member) => {
      const meals = memberMealsMap.get(member.userId) ?? 0;
      const mealCost = Math.round(meals * mealRate * 100) / 100;
      const fixedCost = Math.round(Number(member.userFixedCost?.totalFixedCost ?? 0) * 100) / 100;
      const totalDue = Math.round((mealCost + fixedCost) * 100) / 100;
      const bazarContrib = Math.round((bazarContribMap.get(member.userId) ?? 0) * 100) / 100;
      const deposited = Math.round((depositMap.get(member.userId) ?? 0) * 100) / 100;
      const refundReceived = Math.round((refundMap.get(member.userId) ?? 0) * 100) / 100;
      const totalPaid = Math.round((bazarContrib + deposited) * 100) / 100;
      // balance before refund, then offset by any refund paid back
      const rawBalance = Math.round((totalDue - totalPaid) * 100) / 100;
      const balance = Math.round((rawBalance + refundReceived) * 100) / 100;

      totalMemberDues += totalDue;

      return {
        userId: member.userId,
        user: member.user,
        meals,
        mealCost,
        fixedCost,
        totalDue,
        bazarContribution: bazarContrib,
        deposits: deposited,
        refundReceived,
        totalPaid,
        balance,
        status: balance > 0.01 ? 'OWES' : balance < -0.01 ? 'GETS_REFUND' : 'SETTLED',
      };
    });

    // --- payouts breakdown ---
    const totalFixedCostsSum = members.reduce(
      (s, m) => s + Number(m.userFixedCost?.totalFixedCost ?? 0), 0,
    );

    const houseBillPayouts = payouts.filter((p: any) => p.category !== PayoutCategory.MEMBER_REFUND);
    const refundPayouts = payouts.filter((p: any) => p.category === PayoutCategory.MEMBER_REFUND);
    const totalHouseBills = houseBillPayouts.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalMemberRefunds = refundPayouts.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPayouts = Math.round((totalHouseBills + totalMemberRefunds) * 100) / 100;

    // --- house summary ---
    const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
    // gross collected = all bazar purchases + all direct deposits
    const totalCollected = Math.round((totalBazarExpense + totalDeposits) * 100) / 100;
    // net collected = gross - refunds paid back out
    const netCollected = Math.round((totalCollected - totalMemberRefunds) * 100) / 100;
    // outstanding = what members still owe (sum of positive balances only)
    const totalOutstanding = Math.round(
      memberBreakdown.reduce((s, m) => s + (m.balance > 0 ? m.balance : 0), 0) * 100,
    ) / 100;
    // balanced when every member is settled and all house bills are covered
    const isBalanced = totalOutstanding === 0 && memberBreakdown.every((m) => m.status !== 'GETS_REFUND');

    return {
      month,
      mealRate: Math.round(mealRate * 100) / 100,
      totalHouseMeals,
      members: memberBreakdown,
      payouts: payouts.map((p: any) => ({
        id: p.id,
        title: p.description,
        category: p.category,
        amount: Number(p.amount),
        createdAt: p.createdAt,
      })),
      houseSummary: {
        totalBazarExpense: Math.round(totalBazarExpense * 100) / 100,
        totalFixedCosts: Math.round(totalFixedCostsSum * 100) / 100,
        totalDeposits: Math.round(totalDeposits * 100) / 100,
        totalCollected,
        netCollected,
        totalMemberDues: Math.round(totalMemberDues * 100) / 100,
        totalOutstanding,
        totalHouseBills: Math.round(totalHouseBills * 100) / 100,
        totalMemberRefunds: Math.round(totalMemberRefunds * 100) / 100,
        totalPayouts,
        isBalanced,
      },
    };
  }
}
