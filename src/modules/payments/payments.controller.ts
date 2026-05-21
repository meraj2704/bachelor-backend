import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { CreateDepositDto } from './dto/create-deposit.dto.js';
import { CreatePayoutDto } from './dto/create-payout.dto.js';
import { DepositResponseDto, DepositListResponseDto } from './dto/deposit-response.dto.js';
import { PayoutResponseDto, PayoutListResponseDto } from './dto/payout-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private getHouseId(user: any): string {
    const houseId = user?.managedHouse?.id || user?.membership?.houseId || user?.houseId;
    if (!houseId) throw new BadRequestException('User is not associated with any house.');
    return houseId;
  }

  // ── settlement summary ────────────────────────────────────────────────────

  @Get('settlement')
  @ApiOperation({
    summary: 'Monthly settlement summary',
    description:
      'Full breakdown per member: meals, meal cost, fixed cost, bazar contribution, deposits, balance. Also includes payouts and house summary.',
  })
  @ApiQuery({ name: 'month', required: true, example: '2026-05', description: 'YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Settlement summary returned' })
  async getSettlement(@Request() req, @Query('month') month: string) {
    if (!month) throw new BadRequestException('month query param is required (YYYY-MM)');
    const houseId = this.getHouseId(req.user);
    return this.paymentsService.getSettlement(houseId, month);
  }

  // ── deposits ──────────────────────────────────────────────────────────────

  @Post('deposits/add')
  @ApiOperation({
    summary: 'Add deposit',
    description: 'Record extra cash paid by a member to the manager.',
  })
  @ApiResponse({ status: 201, type: DepositResponseDto })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async addDeposit(@Body() dto: CreateDepositDto, @Request() req) {
    const houseId = this.getHouseId(req.user);
    return this.paymentsService.addDeposit(houseId, dto, req.user.id);
  }

  @Get('deposits')
  @ApiOperation({ summary: 'List deposits', description: 'Optionally filter by month.' })
  @ApiQuery({ name: 'month', required: false, example: '2026-05' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, type: DepositListResponseDto })
  async getDeposits(
    @Request() req,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const houseId = this.getHouseId(req.user);
    return this.paymentsService.getDeposits(
      houseId,
      month,
      limit ? parseInt(limit) : 50,
      page ? parseInt(page) : 1,
    );
  }

  // ── payouts ───────────────────────────────────────────────────────────────

  @Post('payouts/add')
  @ApiOperation({
    summary: 'Record payout',
    description:
      'Record a house bill (gas, electricity, wifi, rent, maid) or a member refund. For MEMBER_REFUND the `to` field is required.',
  })
  @ApiResponse({ status: 201, type: PayoutResponseDto })
  @ApiResponse({ status: 400, description: '`to` required for MEMBER_REFUND' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async recordPayout(@Body() dto: CreatePayoutDto, @Request() req) {
    const houseId = this.getHouseId(req.user);
    return this.paymentsService.recordPayout(houseId, dto, req.user.id);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List payouts', description: 'Optionally filter by month.' })
  @ApiQuery({ name: 'month', required: false, example: '2026-05' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, type: PayoutListResponseDto })
  async getPayouts(
    @Request() req,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const houseId = this.getHouseId(req.user);
    return this.paymentsService.getPayouts(
      houseId,
      month,
      limit ? parseInt(limit) : 50,
      page ? parseInt(page) : 1,
    );
  }
}
