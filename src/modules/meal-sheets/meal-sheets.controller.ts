import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ManagerGuard } from './guards/manager.guard.js';
import { MealSheetsService } from './meal-sheets.service.js';
import {
  BulkUpdateSheetDto,
  ExportFormat,
  LockMonthDto,
  MealSheetExportQueryDto,
  MealSheetMonthQueryDto,
  UpdateCellDto,
} from './dto/meal-sheet.dto.js';

@ApiTags('Meal Sheets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, ManagerGuard)
@Controller('meal-sheets')
export class MealSheetsController {
  constructor(private readonly service: MealSheetsService) { }

  @Get('grid')
  @ApiOperation({ summary: 'Full monthly grid (members × days) with totals & lock state' })
  async getGrid(@Request() req, @Query() query: MealSheetMonthQueryDto) {
    return this.service.getGrid(req.houseId, query);
  }

  @Get('status')
  @ApiOperation({ summary: 'Lightweight lock status for a month' })
  async getStatus(@Request() req, @Query() query: MealSheetMonthQueryDto) {
    return this.service.getStatus(req.houseId, query);
  }

  @Get('today')
  @ApiOperation({ summary: 'Daily headcount — all members with today\'s meal counts' })
  async getDailyHeadcount(@Request() req) {
    return this.service.getDailyHeadcount(req.houseId);
  }

  @Patch('cell')
  @ApiOperation({ summary: 'Manager override for a single cell' })
  async updateCell(@Request() req, @Body() dto: UpdateCellDto) {
    return this.service.updateCell(req.houseId, req.user.id, dto);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Manager bulk update — returns updated + skipped' })
  async bulkUpdate(@Request() req, @Body() dto: BulkUpdateSheetDto) {
    return this.service.bulkUpdate(req.houseId, req.user.id, dto);
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock the month — blocks all meal writes' })
  async lock(@Request() req, @Body() dto: LockMonthDto) {
    return this.service.lockMonth(req.houseId, req.user.id, dto);
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock a previously locked month' })
  async unlock(@Request() req, @Body() dto: LockMonthDto) {
    return this.service.unlockMonth(req.houseId, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export the monthly sheet (CSV; PDF not yet implemented)' })
  async exportSheet(
    @Request() req,
    @Query() query: MealSheetExportQueryDto,
    @Res() res: Response,
  ) {
    const body = await this.service.exportSheet(req.houseId, query);
    const ext = query.format === ExportFormat.CSV ? 'csv' : 'csv';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meal-sheet-${query.month}.${ext}"`,
    );
    res.send(body);
  }
}
