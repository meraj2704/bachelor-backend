import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Main dashboard',
    description:
      'Returns everything needed for the dashboard in a single request: ' +
      'house info, today\'s cooking totals, current month financial summary, ' +
      'per-member settlement, bazar category chart, daily meal chart, and recent activity feed.',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    example: '2026-05',
    description: 'YYYY-MM — defaults to current month',
  })
  async getDashboard(@Request() req, @Query('month') month?: string) {
    const houseId =
      req.user?.managedHouse?.id ||
      req.user?.membership?.houseId ||
      req.user?.houseId;

    if (!houseId) throw new BadRequestException('User is not associated with any house.');

    return this.dashboardService.getDashboard(houseId, month);
  }
}
