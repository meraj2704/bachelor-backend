import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateHouseDto, MealSystemDto, TransferManagerDto } from './dto/house.dto.js';

@Injectable()
export class HouseService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- GET settings ----------

  async getSettings(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
      select: {
        id: true,
        name: true,
        address: true,
        inviteCode: true,
        isMealSystemActive: true,
        createdAt: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    } as any);

    if (!house) throw new NotFoundException('House not found');

    const h = house as any;
    return {
      id: h.id,
      name: h.name,
      address: h.address ?? null,
      inviteCode: h.inviteCode,
      shareLink: `Join our house with code: ${h.inviteCode}`,
      isMealSystemActive: h.isMealSystemActive,
      createdAt: h.createdAt,
      manager: h.manager,
      activeMemberCount: h._count?.members ?? 0,
    };
  }

  // ---------- PATCH update info ----------

  async updateHouse(houseId: string, dto: UpdateHouseDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;

    const house = await this.prisma.house.update({
      where: { id: houseId },
      data,
      select: { id: true, name: true, address: true, updatedAt: true },
    });

    return house;
  }

  // ---------- GET invite code ----------

  async getInviteCode(houseId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
      select: { inviteCode: true, name: true },
    } as any) as any;

    if (!house) throw new NotFoundException('House not found');

    return {
      inviteCode: house.inviteCode,
      shareLink: `Join our house "${house.name}" with code: ${house.inviteCode}`,
    };
  }

  // ---------- POST regenerate invite code ----------

  async regenerateInviteCode(houseId: string) {
    const { randomBytes } = await import('crypto');
    const newCode = randomBytes(6).toString('hex').toUpperCase();

    const house = await this.prisma.house.update({
      where: { id: houseId },
      data: { inviteCode: newCode } as any,
      select: { inviteCode: true, name: true },
    } as any) as any;

    return {
      inviteCode: house.inviteCode,
      shareLink: `Join our house "${house.name}" with code: ${house.inviteCode}`,
      message: 'Invite code regenerated. Old code is now invalid.',
    };
  }

  // ---------- PATCH meal system toggle ----------

  async updateMealSystem(houseId: string, dto: MealSystemDto) {
    const house = await this.prisma.house.update({
      where: { id: houseId },
      data: { isMealSystemActive: dto.isMealSystemActive },
      select: { id: true, isMealSystemActive: true, updatedAt: true },
    });

    return {
      isMealSystemActive: house.isMealSystemActive,
      message: house.isMealSystemActive ? 'Meal system enabled.' : 'Meal system disabled.',
    };
  }

  // ---------- PATCH transfer manager ----------

  async transferManager(houseId: string, currentManagerId: string, dto: TransferManagerDto) {
    if (dto.newManagerUserId === currentManagerId) {
      throw new BadRequestException('You are already the manager.');
    }

    const newManagerMember = await this.prisma.houseMember.findFirst({
      where: { houseId, userId: dto.newManagerUserId, isActive: true },
      select: { id: true, role: true },
    });

    if (!newManagerMember) {
      throw new NotFoundException('New manager must be an active member of this house.');
    }

    await this.prisma.$transaction(async (tx) => {
      // demote current manager to member
      await tx.houseMember.updateMany({
        where: { houseId, userId: currentManagerId },
        data: { role: 'MEMBER' },
      });

      // promote new manager
      await tx.houseMember.update({
        where: { id: newManagerMember.id },
        data: { role: 'MANAGER' },
      });

      // update house managerId
      await tx.house.update({
        where: { id: houseId },
        data: { managerId: dto.newManagerUserId },
      });
    });

    const newManager = await this.prisma.user.findUnique({
      where: { id: dto.newManagerUserId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return {
      message: 'Manager transferred successfully.',
      newManager,
    };
  }

  // ---------- DELETE house ----------

  async deleteHouse(houseId: string, managerId: string) {
    const house = await this.prisma.house.findUnique({
      where: { id: houseId },
      select: { managerId: true, name: true },
    });

    if (!house) throw new NotFoundException('House not found');
    if (house.managerId !== managerId) {
      throw new ForbiddenException('Only the manager can delete the house.');
    }

    await this.prisma.house.delete({ where: { id: houseId } });

    return { message: `House "${house.name}" has been permanently deleted.` };
  }
}
