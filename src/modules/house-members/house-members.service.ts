import { Injectable } from '@nestjs/common';
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

  findOne(id: number) {
    return `This action returns a #${id} houseMember`;
  }




}
