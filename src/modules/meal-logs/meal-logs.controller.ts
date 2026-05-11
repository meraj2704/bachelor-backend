import { Controller, Post, Get, Patch, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  BulkUpdateMealDto,
  MealLogMonthQueryDto,
  MealLogRangeQueryDto,
  UpdateDayMealDto,
} from './dto/meal-log.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MealLogService } from './meal-logs.service.js';

@ApiTags('Meal Logs')
@Controller('meal-logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class MealLogController {
  constructor(private readonly mealLogService: MealLogService) {}

  private getHouseId(user: any): string {
    return user.membership?.houseId || user.managedHouse?.id;
  }

  /**
   * Toggle lunch/dinner or add guests for a specific day.
   * Default state is lunch=ON, dinner=ON, no guests.
   * Deadline: cannot edit past days or today after 10:00 AM.
   */
  @Patch('update-day')
  @ApiOperation({
    summary: 'Update meal for a specific day',
    description:
      'Toggle lunch/dinner ON or OFF, or set guest counts. ' +
      'Omit a field to keep its current value. ' +
      'Cannot edit past days or today after 10:00 AM.',
  })
  async updateDay(@Request() req, @Body() dto: UpdateDayMealDto) {
    return this.mealLogService.updateDay(req.user.id, this.getHouseId(req.user), dto);
  }

  /**
   * Bulk update meals for multiple future days at once.
   * Skips past dates and today after 10:00 AM silently.
   */
  @Post('bulk-update')
  @ApiOperation({
    summary: 'Bulk update meals for multiple days',
    description: 'Each entry requires all fields (lunch, dinner, guestLunch, guestDinner). Past dates are skipped.',
  })
  async bulkUpdate(@Request() req, @Body() dto: BulkUpdateMealDto) {
    return this.mealLogService.bulkUpdate(req.user.id, this.getHouseId(req.user), dto);
  }

  /**
   * Get the logged-in user's meal logs for a date range.
   * Dates without a DB record are returned as virtual defaults (lunch=1, dinner=1).
   */
  @Get('my-logs')
  @ApiOperation({
    summary: 'Get my meal logs for a date range',
    description:
      'Returns one entry per day. Days with no changes show defaults: lunch ON, dinner ON, no guests.',
  })
  async getMyLogs(@Request() req, @Query() query: MealLogRangeQueryDto) {
    return this.mealLogService.getMyLogs(req.user.id, this.getHouseId(req.user), query);
  }

  /**
   * Get all active members' meal logs for a month.
   * Each member's missing days are filled with defaults.
   */
  @Get('house-logs')
  @ApiOperation({
    summary: 'Get meal logs for all house members (manager view)',
    description: 'Returns per-member logs for the given month with defaults filled in for missing days.',
  })
  async getHouseLogs(@Request() req, @Query() query: MealLogMonthQueryDto) {
    const houseId = req.user.managedHouse?.id || this.getHouseId(req.user);
    return this.mealLogService.getHouseLogs(houseId, query);
  }

  /**
   * Monthly meal totals per member — used for billing calculations.
   * Only counts days up to today for the current month.
   */
  @Get('monthly-summary')
  @ApiOperation({
    summary: 'Get monthly meal totals per member',
    description:
      'Aggregates totalMeals, totalLunch, totalDinner, totalGuestLunch, totalGuestDinner per member. ' +
      'Counts up to today for the current month.',
  })
  async getMonthlySummary(@Request() req, @Query() query: MealLogMonthQueryDto) {
    const houseId = req.user.managedHouse?.id || this.getHouseId(req.user);
    return this.mealLogService.getMonthlySummary(houseId, query);
  }
}
