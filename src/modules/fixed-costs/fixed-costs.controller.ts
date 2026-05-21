import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FixedCostsService } from './fixed-costs.service.js';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ManagerGuard } from '../../common/guards/manager.guard.js';

@ApiTags('Fixed Costs Management')
@ApiBearerAuth('JWT-auth') // Matches your main.ts security scheme
@UseGuards(JwtAuthGuard, ManagerGuard) // Fixed costs can only be managed by the house manager
@Controller('fixed-costs')
export class FixedCostsController {
  constructor(private readonly fixedCostsService: FixedCostsService) { }

  @Post('upsert/:memberId')
  @ApiOperation({
    summary: 'Create or update member fixed costs (manager only)',
    description: 'If costs exist for this member, they are updated. Otherwise, a new record is created. Total cost is calculated automatically.'
  })
  @ApiParam({ name: 'memberId', description: 'The unique ID of the House Member' })
  @ApiResponse({ status: 201, description: 'Costs successfully synchronized.' })
  @ApiResponse({ status: 403, description: 'Only the house manager can perform this action.' })
  async upsert(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateFixedCostDto,
    @Request() req,
  ) {
    // req.houseId is set by ManagerGuard
    return this.fixedCostsService.updateMemberCosts(
      memberId,
      req.houseId,
      dto,
      req.user.id,
    );
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get fixed costs for a specific member (manager only)' })
  async findOne(@Param('memberId') memberId: string, @Request() req) {
    return this.fixedCostsService.findOneByMember(memberId, req.houseId);
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Delete a member\'s fixed cost record (manager only)' })
  async remove(@Param('memberId') memberId: string, @Request() req) {
    return this.fixedCostsService.remove(memberId, req.houseId);
  }
}
