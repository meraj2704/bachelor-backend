import { Module } from '@nestjs/common';
import { MealLogController } from './meal-logs.controller.js';
import { MealLogService } from './meal-logs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';


@Module({
  controllers: [MealLogController],
  providers: [MealLogService, PrismaService],
})
export class MealLogsModule { }
