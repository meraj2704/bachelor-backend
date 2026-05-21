import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- platform overview ----------

  async getOverview() {
    const [
      houses,
      users,
      activeUsers,
      activeMembers,
      bazarAgg,
      bazarEntries,
      depositAgg,
      mealLogs,
      recentHouses,
    ] = await Promise.all([
      this.prisma.house.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.houseMember.count({ where: { isActive: true } }),
      this.prisma.expense.aggregate({
        where: { isBazar: true },
        _sum: { amount: true },
      }),
      this.prisma.expense.count({ where: { isBazar: true } }),
      this.prisma.deposit.aggregate({ _sum: { amount: true } }),
      this.prisma.mealLog.count(),
      this.prisma.house.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
      }),
    ]);

    return {
      totals: {
        houses,
        users,
        activeUsers,
        inactiveUsers: users - activeUsers,
        activeMembers,
        bazarVolume: Number(bazarAgg._sum.amount ?? 0),
        bazarEntries,
        depositVolume: Number(depositAgg._sum.amount ?? 0),
        mealLogs,
      },
      recentHouses: recentHouses.map((h) => ({
        id: h.id,
        name: h.name,
        createdAt: h.createdAt,
        manager: h.manager
          ? `${h.manager.firstName} ${h.manager.lastName}`
          : '—',
        memberCount: h._count.members,
      })),
    };
  }

  // ---------- houses ----------

  async getHouses() {
    const houses = await this.prisma.house.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        inviteCode: true,
        isMealSystemActive: true,
        createdAt: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { members: true, expenses: true } },
      },
    });

    return houses.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      inviteCode: h.inviteCode,
      isMealSystemActive: h.isMealSystemActive,
      createdAt: h.createdAt,
      manager: h.manager
        ? {
            id: h.manager.id,
            name: `${h.manager.firstName} ${h.manager.lastName}`,
            email: h.manager.email,
          }
        : null,
      memberCount: h._count.members,
      expenseCount: h._count.expenses,
    }));
  }

  async deleteHouse(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
      select: { id: true, name: true },
    });
    if (!house) throw new NotFoundException('House not found');

    // House children all cascade on delete (members, expenses, meals, etc.).
    await this.prisma.house.delete({ where: { id: houseId } });
    return {
      message: `House "${house.name}" and all of its data have been permanently deleted.`,
    };
  }

  // ---------- users ----------

  async getUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        membership: {
          select: {
            role: true,
            house: { select: { id: true, name: true } },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt,
      role: u.membership?.role ?? null,
      house: u.membership?.house ?? null,
    }));
  }

  async setUserActive(userId: string, isActive: boolean, requesterId: string) {
    if (userId === requesterId) {
      throw new BadRequestException('You cannot change your own account status.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        // Deactivating also invalidates the user's existing login sessions.
        tokenVersion: isActive ? undefined : { increment: 1 },
      },
      select: { id: true, isActive: true },
    });
    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? 'User reactivated.' : 'User deactivated.',
    };
  }
}
