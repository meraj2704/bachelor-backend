import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { HouseService } from './house.service.js';
import { UpdateHouseDto, MealSystemDto, TransferManagerDto } from './dto/house.dto.js';

@ApiTags('House Settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('house')
export class HouseController {
  constructor(private readonly houseService: HouseService) {}

  private getManagerHouseId(user: any): string {
    const houseId = user?.managedHouse?.id;
    if (!houseId) throw new BadRequestException('Only the house manager can perform this action.');
    return houseId;
  }

  // ── General Info ─────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get house settings', description: 'Returns full house info including invite code, member count, and manager.' })
  @ApiResponse({ status: 200, description: 'House settings returned.' })
  async getSettings(@Request() req) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.getSettings(houseId);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update house name and/or address' })
  @ApiResponse({ status: 200, description: 'House info updated.' })
  async updateHouse(@Request() req, @Body() dto: UpdateHouseDto) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.updateHouse(houseId, dto);
  }

  // ── Invite Code ───────────────────────────────────────────────────────────

  @Get('invite-code')
  @ApiOperation({ summary: 'Get current invite code and share link' })
  @ApiResponse({ status: 200, description: 'Invite code returned.' })
  async getInviteCode(@Request() req) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.getInviteCode(houseId);
  }

  @Post('regenerate-invite')
  @ApiOperation({
    summary: 'Regenerate invite code',
    description: 'Generates a new invite code. The old code becomes invalid immediately.',
  })
  @ApiResponse({ status: 201, description: 'New invite code generated.' })
  async regenerateInvite(@Request() req) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.regenerateInviteCode(houseId);
  }

  // ── Meal System ───────────────────────────────────────────────────────────

  @Patch('meal-system')
  @ApiOperation({ summary: 'Enable or disable the meal system' })
  @ApiResponse({ status: 200, description: 'Meal system status updated.' })
  async updateMealSystem(@Request() req, @Body() dto: MealSystemDto) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.updateMealSystem(houseId, dto);
  }

  // ── Danger Zone ───────────────────────────────────────────────────────────

  @Patch('transfer-manager')
  @ApiOperation({
    summary: 'Transfer manager role to another member',
    description: 'Current manager is demoted to member. New manager must be an active member.',
  })
  @ApiResponse({ status: 200, description: 'Manager transferred.' })
  @ApiResponse({ status: 404, description: 'New manager not found or not an active member.' })
  async transferManager(@Request() req, @Body() dto: TransferManagerDto) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.transferManager(houseId, req.user.id, dto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete the entire house',
    description: 'Permanently deletes the house and all associated data. This action cannot be undone.',
  })
  @ApiResponse({ status: 200, description: 'House deleted.' })
  @ApiResponse({ status: 403, description: 'Only the manager can delete the house.' })
  async deleteHouse(@Request() req) {
    const houseId = this.getManagerHouseId(req.user);
    return this.houseService.deleteHouse(houseId, req.user.id);
  }
}
