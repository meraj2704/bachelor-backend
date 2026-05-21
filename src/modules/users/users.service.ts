import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  /**
   * Utility to remove sensitive fields from the user object
   */
  private sanitizeUser(user: any) {
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Fetches the profile of the currently authenticated user
   * Includes house membership details
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        membership: {
          include: {
            house: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Fetches a list of users with pagination and filtering
   */
  async users(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    const users = await this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Updates specific user fields safely
   */
  async updateUser(userId: string, data: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      data,
      where: { id: userId },
    });
    return this.sanitizeUser(user);
  }

  /**
   * Permanently deletes a user from the database
   */
  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Current password is incorrect');

    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('New password must be different from current password');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password updated successfully.' };
  }

  async getMyStats(userId: string) {
    const [mealAgg, depositAgg] = await Promise.all([
      this.prisma.mealLog.aggregate({
        where: { userId },
        _sum: { totalDay: true },
      }),
      this.prisma.deposit.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalMeals: Number(mealAgg._sum.totalDay ?? 0),
      totalDeposited: Number(depositAgg._sum.amount ?? 0),
    };
  }

  async logoutAll(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Signed out from all devices.' };
  }
}