import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

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
        membership: true
      }
    });

    console.log('user', user)

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
}