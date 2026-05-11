import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MealSheetsController } from './meal-sheets.controller.js';
import { MealSheetsService } from './meal-sheets.service.js';

@Module({
  controllers: [MealSheetsController],
  providers: [MealSheetsService, PrismaService],
  exports: [MealSheetsService],
})
export class MealSheetsModule {}
