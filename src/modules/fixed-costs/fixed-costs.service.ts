import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto.js';

@Injectable()
export class FixedCostsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Ensures the HouseMember belongs to the given house before any mutation/read. */
  private async assertMemberInHouse(memberId: string, houseId: string) {
    const member = await this.prisma.houseMember.findFirst({
      where: { id: memberId, houseId },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this house');
    }
  }

  async updateMemberCosts(
    memberId: string,
    houseId: string,
    dto: UpdateFixedCostDto,
    updatedById: string
  ) {
    await this.assertMemberInHouse(memberId, houseId);

    const billingFields = [
      'roomRent', 'khalaBill', 'wifiBill',
      'electricity', 'gasBill', 'waterBill', 'otherBill'
    ];

    const totalFixedCost = billingFields.reduce((sum, key) => {
      return sum + (Number(dto[key]) || 0);
    }, 0);

    // 2. Perform the Upsert
    return this.prisma.userFixedCost.upsert({
      where: { memberId: memberId },
      update: {
        ...dto,
        totalFixedCost,
        updatedById,
      },
      create: {
        ...dto,
        memberId,
        houseId,
        totalFixedCost,
        updatedById,
      },
      include: {
        member: {
          select: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });
  }

  // Find fixed costs for a specific member
  async findOneByMember(memberId: string, houseId: string) {
    await this.assertMemberInHouse(memberId, houseId);
    const record = await this.prisma.userFixedCost.findUnique({
      where: { memberId },
    });
    if (!record) throw new NotFoundException('No fixed costs found for this member');
    return record;
  }

  // Remove costs (delete record)
  async remove(memberId: string, houseId: string) {
    await this.assertMemberInHouse(memberId, houseId);
    return this.prisma.userFixedCost.delete({
      where: { memberId },
    });
  }
}
