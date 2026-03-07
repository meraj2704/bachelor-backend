import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateBazarDto } from './dto/create-bazar.dto.js';
import { QueryBazarDto } from './dto/query-bazar.dto.js';
import { UpdateBazarDto } from './dto/update-bazar.dto.js';

@Injectable()
export class BazarService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createBazarDto: CreateBazarDto, houseId: string, creatorId: string) {
    const { amount, expenseDate, ...rest } = createBazarDto;

    return await this.prisma.expense.create({
      data: {
        ...rest,
        amount: amount.toString(), // Ensuring it matches Prisma String/Decimal type
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        houseId: houseId,
        payerId: creatorId,
        createdById: creatorId,
        isBazar: true,
        isFixedCost: false,
        category: 'MEAL_BAZAR',
      },
      include: {
        payer: { select: { firstName: true, lastName: true } }
      }
    });
  }

  async findAll(houseId: string, query: QueryBazarDto) {
    const { month, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      houseId,
      isBazar: true,
      ...this.getMonthDateRange(month),
      ...(search && {
        OR: [
          {

            title: { contains: search, mode: 'insensitive' as const },
          }, {
            payer: {
              OR: [{
                firstName: {
                  contains: search, mode: 'insensitive' as const
                }
              }, {
                lastName: {
                  contains: search, mode: 'insensitive' as const
                }
              }]
            }
          }
        ]
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          payer: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findAllForMe(userId: string, query: QueryBazarDto) {
    const { month, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      payerId: userId,
      isBazar: true,
      ...this.getMonthDateRange(month),
      ...(search && {
        OR: [
          {

            title: { contains: search, mode: 'insensitive' as const },
          }, {
            payer: {
              OR: [{
                firstName: {
                  contains: search, mode: 'insensitive' as const
                }
              }, {
                lastName: {
                  contains: search, mode: 'insensitive' as const
                }
              }]
            }
          }
        ]
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          payer: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async update(id: string, updateBazarDto: UpdateBazarDto, userId: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) throw new NotFoundException('Bazar entry not found');

    return await this.prisma.expense.update({
      where: { id },
      data: {
        ...updateBazarDto,
        updatedById: userId,
      },
    });
  }

  async remove(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Bazar entry not found');

    return await this.prisma.expense.delete({ where: { id } });
  }

  private getMonthDateRange(month?: string) {
    if (!month) return {};
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, mon - 1, 1));
    const endDate = new Date(Date.UTC(year, mon, 1));

    return {
      expenseDate: {
        gte: startDate,
        lt: endDate,
      },
    };
  }
}