import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { BazarService } from './bazar.service.js';
import { CreateBazarDto } from './dto/create-bazar.dto.js';
import { UpdateBazarDto } from './dto/update-bazar.dto.js';
import {
  QueryBazarDto,
  MonthlySummaryQueryDto,
  MonthlySettlementQueryDto,
} from './dto/query-bazar.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Bazar & Expenses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bazar')
export class BazarController {
  constructor(private readonly bazarService: BazarService) {}

  private getHouseId(user: any): string {
    const houseId = user?.managedHouse?.id || user?.membership?.houseId || user?.houseId;
    if (!houseId) {
      throw new BadRequestException('User is not associated with any house.');
    }
    return houseId;
  }

  @Post('add')
  @ApiOperation({ summary: 'Create a new Bazar entry' })
  @ApiResponse({ status: 201, description: 'Bazar entry created.' })
  async create(@Body() dto: CreateBazarDto, @Request() req) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.create(dto, houseId, req.user.id);
  }

  @Get('all')
  @ApiOperation({ summary: 'List bazar entries for the house' })
  async findAll(@Request() req, @Query() query: QueryBazarDto) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.findAll(houseId, query);
  }

  @Get('all/for-me')
  @ApiOperation({ summary: 'List bazar entries paid by the current user' })
  async findAllForMe(@Request() req, @Query() query: QueryBazarDto) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.findAllForMe(req.user.id, houseId, query);
  }

  @Get('monthly-summary')
  @ApiOperation({ summary: 'Monthly bazar aggregates for stats cards' })
  async monthlySummary(
    @Request() req,
    @Query() query: MonthlySummaryQueryDto,
  ) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.monthlySummary(houseId, req.user.id, query);
  }

  @Get('monthly-settlement')
  @ApiOperation({ summary: 'Monthly settlement: shows each member\'s balance (owes/gets refund)' })
  async monthlySettlement(
    @Request() req,
    @Query() query: MonthlySettlementQueryDto,
  ) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.monthlySettlement(houseId, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bazar entry (payer or manager only)' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBazarDto,
    @Request() req,
  ) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.update(id, dto, req.user.id, houseId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bazar entry (payer or manager only)' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id') id: string, @Request() req) {
    const houseId = this.getHouseId(req.user);
    return this.bazarService.remove(id, req.user.id, houseId);
  }

  @Get('export')
  @ApiOperation({ summary: 'CSV export of bazar entries' })
  async exportCsv(
    @Request() req,
    @Query() query: QueryBazarDto & { scope?: 'house' | 'me' },
    @Res() res: Response,
  ) {
    const houseId = this.getHouseId(req.user);
    const csv = await this.bazarService.exportCsv(houseId, req.user.id, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bazar-${query.month}.csv"`,
    );
    res.send(csv);
  }
}
