// meal-log.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BulkUpdateMealDto } from './dto/meal-log.dto.js';
import { isBefore, startOfToday, setHours, setMinutes } from 'date-fns';

@Injectable()
export class MealLogService {
  constructor(private prisma: PrismaService) { }

  async bulkUpdate(userId: string, houseId: string, dto: BulkUpdateMealDto) {
    const today = startOfToday();
    const cutoffTime = setMinutes(setHours(today, 10), 0); // 10:00 AM

    return await this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const meal of dto.meals) {
        const mealDate = new Date(meal.date);

        // 10:00 AM DEADLINE CHECK
        if (isBefore(mealDate, today) || (mealDate.getTime() === today.getTime() && new Date() > cutoffTime)) {
          // Skip or throw error for past dates/past 10 AM today
          continue;
        }

        const upserted = await tx.mealLog.upsert({
          where: {
            houseId_userId_date: { houseId, userId, date: mealDate },
          },
          update: {
            lunch: meal.lunch ? 1 : 0,
            dinner: meal.dinner ? 1 : 0,
            guestLunch: meal.guestLunch,
            guestDinner: meal.guestDinner,
            totalDay: (meal.lunch ? 1 : 0) + (meal.dinner ? 1 : 0) + meal.guestLunch + meal.guestDinner,
            updatedById: userId,
          },
          create: {
            houseId,
            userId,
            date: mealDate,
            lunch: meal.lunch ? 1 : 0,
            dinner: meal.dinner ? 1 : 0,
            guestLunch: meal.guestLunch,
            guestDinner: meal.guestDinner,
            totalDay: (meal.lunch ? 1 : 0) + (meal.dinner ? 1 : 0) + meal.guestLunch + meal.guestDinner,
            createdById: userId,
          },
        });
        results.push(upserted);
      }
      return results;
    });
  }

  async getWeeklyLogs(userId: string, houseId: string, startDate: string, endDate: string) {
    return this.prisma.mealLog.findMany({
      where: {
        userId,
        houseId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
  }
}