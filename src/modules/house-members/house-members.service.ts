import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    // 1. Fetch current status
    const member = await this.prisma.houseMember.findFirst({
      where: { id: memberId, houseId },
      select: { isActive: true, role: true }
    });

    if (!member) throw new NotFoundException('Member not found');

    // 2. Prevent Manager from deactivating themselves
    if (member.role === 'MANAGER' && member.isActive) {
      throw new ForbiddenException('Manager status cannot be toggled.');
    }

    // 3. Toggle logic
    const newStatus = !member.isActive;

    return await this.prisma.houseMember.update({
      where: { id: memberId },
      data: {
        isActive: newStatus,
        // If turning active, clear leftDate. If deactivating, set leftDate.
        leftDate: newStatus ? null : new Date(),
      }
    });
  }



}
