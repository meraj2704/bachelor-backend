import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto.js';

@Injectable()
export class FixedCostsService {
  constructor(private readonly prisma: PrismaService) { }

  async updateMemberCosts(
    memberId: string,
    houseId: string,
    dto: UpdateFixedCostDto,
    updatedById: string
  ) {

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
  async findOneByMember(memberId: string) {
    const record = await this.prisma.userFixedCost.findUnique({
      where: { memberId },
    });
    if (!record) throw new NotFoundException('No fixed costs found for this member');
    return record;
  }

  // Remove costs (Reset to zero or delete record)
  async remove(memberId: string) {
    return this.prisma.userFixedCost.delete({
      where: { memberId },
    });
  }
}