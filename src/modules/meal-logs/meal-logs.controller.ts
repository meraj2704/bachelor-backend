// meal-log.controller.ts
import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';

import { BulkUpdateMealDto } from './dto/meal-log.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MealLogService } from './meal-logs.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Meal Logs')
@Controller('meal-logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class MealLogController {
  constructor(private readonly mealLogService: MealLogService) { }

  @Post('bulk-update')
  async updateMeals(@Request() req, @Body() dto: BulkUpdateMealDto) {
    return this.mealLogService.bulkUpdate(req.user.id, req.user.houseId, dto);
  }

  @Get('my-logs')
  async getMyLogs(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.mealLogService.getWeeklyLogs(req.user.id, req.user.houseId, startDate, endDate);
  }
}