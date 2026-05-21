import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateMenuDto } from './dto/menu.dto.js';
import { DayOfWeek, WEEK_ORDER } from './menu.enums.js';

export type MenuDay = {
  dayOfWeek: DayOfWeek;
  lunch: string;
  dinner: string;
};

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all 7 days in Sat→Fri order. Days never saved yet come back as
   * empty strings (virtual defaults), so the client always gets a full week.
   */
  async getMenu(houseId: string): Promise<MenuDay[]> {
    const rows = await this.prisma.weeklyMenu.findMany({ where: { houseId } });
    const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));

    return WEEK_ORDER.map((day) => {
      const row = byDay.get(day);
      return {
        dayOfWeek: day,
        lunch: row?.lunch ?? '',
        dinner: row?.dinner ?? '',
      };
    });
  }

  /**
   * Upserts each submitted day on the (houseId, dayOfWeek) unique key.
   * Runs as a single transaction so a partial save can't happen.
   */
  async updateMenu(
    houseId: string,
    dto: UpdateMenuDto,
    userId: string,
  ): Promise<MenuDay[]> {
    await this.prisma.$transaction(
      dto.days.map((day) =>
        this.prisma.weeklyMenu.upsert({
          where: { houseId_dayOfWeek: { houseId, dayOfWeek: day.dayOfWeek } },
          update: {
            lunch: day.lunch,
            dinner: day.dinner,
            updatedById: userId,
          },
          create: {
            houseId,
            dayOfWeek: day.dayOfWeek,
            lunch: day.lunch,
            dinner: day.dinner,
            updatedById: userId,
          },
        }),
      ),
    );

    return this.getMenu(houseId);
  }
}
