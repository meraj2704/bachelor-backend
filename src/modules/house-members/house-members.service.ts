import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';


@Injectable()
export class HouseMembersService {
  constructor(private prisma: PrismaService) { }

  async findAll(houseId: string) {
    return await this.prisma.houseMember.findMany({
      where: {
        houseId
      }, select: {
        id: true,
        houseId: true,
        isActive: true,
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        userFixedCost: {
          select: {
            id: true,
            totalFixedCost: true,
            khalaBill: true,
            roomRent: true,
            electricity: true,
            wifiBill: true,
            waterBill: true,
            otherBill: true
          }
        }
      }
    })
  }

  async toggleMemberStatus(memberId: string, houseId: string) {
    const member = await this.prisma.houseMember.findFirst({
      where: { id: memberId, houseId },
      select: { isActive: true, role: true },
    });

    if (!member) throw new NotFoundException('Member not found');

    if (member.role === 'MANAGER' && member.isActive) {
      throw new ForbiddenException('Manager status cannot be toggled.');
    }

    const newStatus = !member.isActive;

    return await this.prisma.houseMember.update({
      where: { id: memberId },
      data: {
        isActive: newStatus,
        leftDate: newStatus ? null : new Date(),
      },
    });
  }

  async removeMember(memberId: string, houseId: string) {
    const member = await this.prisma.houseMember.findFirst({
      where: { id: memberId, houseId },
      select: { role: true, userId: true, user: { select: { firstName: true, lastName: true } } },
    });

    if (!member) throw new NotFoundException('Member not found in this house.');
    if (member.role === 'MANAGER') {
      throw new BadRequestException('Cannot remove the manager. Transfer manager role first.');
    }

    await this.prisma.houseMember.delete({ where: { id: memberId } });

    return {
      message: `${member.user.firstName} ${member.user.lastName} has been permanently removed from the house.`,
      userId: member.userId,
    };
  }
}
