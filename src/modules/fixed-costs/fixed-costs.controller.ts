import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { FixedCostsService } from './fixed-costs.service.js';
import { UpdateFixedCostDto } from './dto/update-fixed-cost.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'; // Adjust path

@ApiTags('Fixed Costs Management')
@ApiBearerAuth('JWT-auth') // Matches your main.ts security scheme
@UseGuards(JwtAuthGuard)
@Controller('fixed-costs')
export class FixedCostsController {
  constructor(private readonly fixedCostsService: FixedCostsService) { }

  @Post('upsert/:memberId')
  @ApiOperation({
    summary: 'Create or Update member fixed costs',
    description: 'If costs exist for this member, they are updated. Otherwise, a new record is created. Total cost is calculated automatically.'
  })
  @ApiParam({ name: 'memberId', description: 'The unique ID of the House Member' })
  @ApiResponse({ status: 201, description: 'Costs successfully synchronized.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid Token.' })
  async upsert(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateFixedCostDto,
    @Request() req
  ) {
    // Extracting houseId and manager's ID from the JWT payload
    // const { houseId, id: managerId } = req.user;
    const user = req.user;

    return this.fixedCostsService.updateMemberCosts(
      memberId,
      user.managedHouse.id,
      dto,
      user.id
    );
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: 'Get fixed costs for a specific member' })
  async findOne(@Param('memberId') memberId: string) {
    return this.fixedCostsService.findOneByMember(memberId);
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Delete a member\'s fixed cost record' })
  async remove(@Param('memberId') memberId: string) {
    return this.fixedCostsService.remove(memberId);
  }
}