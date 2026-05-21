import {
  Controller,
  Get,
  UseGuards,
  Request,
  Patch,
  Delete,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HouseMembersService } from './house-members.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ManagerGuard } from '../../common/guards/manager.guard.js';

@ApiTags('House Members') // Groups these endpoints in Swagger UI
@ApiBearerAuth('JWT-auth')           // Adds the "Authorize" button in Swagger
@UseGuards(JwtAuthGuard)   // Requires a valid JWT token
@Controller('house-members')
export class HouseMembersController {
  constructor(private readonly houseMembersService: HouseMembersService) { }

  @Get('all')
  @ApiOperation({
    summary: 'Get all members of the current user\'s house',
    description: 'Returns every member of the house the logged-in user belongs to — works for both managers and members.'
  })
  @ApiResponse({ status: 200, description: 'Return list of members.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token missing or invalid.' })
  async getHouseMembers(@Request() req) {
    // Managers have managedHouse; members have membership — support both.
    const houseId =
      req.user?.managedHouse?.id || req.user?.membership?.houseId;
    if (!houseId) {
      throw new BadRequestException('User is not associated with any house.');
    }
    return this.houseMembersService.findAll(houseId);
  }

  @Patch(':memberId/status')
  @UseGuards(ManagerGuard)
  @ApiOperation({
    summary: 'Toggle member active/inactive (manager only)',
    description: 'Deactivate keeps history. Cannot toggle the manager.'
  })
  @ApiParam({ name: 'memberId', description: 'HouseMember ID' })
  @ApiResponse({ status: 200, description: 'Member status toggled.' })
  @ApiResponse({ status: 403, description: 'Only the house manager can perform this action.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async toggleStatus(@Param('memberId') memberId: string, @Request() req) {
    return this.houseMembersService.toggleMemberStatus(memberId, req.houseId);
  }

  @Delete(':memberId/remove')
  @UseGuards(ManagerGuard)
  @ApiOperation({
    summary: 'Permanently remove a member from the house (manager only)',
    description: 'Deletes all membership data. Cannot remove the manager — transfer role first.',
  })
  @ApiParam({ name: 'memberId', description: 'HouseMember ID' })
  @ApiResponse({ status: 200, description: 'Member removed.' })
  @ApiResponse({ status: 400, description: 'Cannot remove the manager.' })
  @ApiResponse({ status: 403, description: 'Only the house manager can perform this action.' })
  @ApiResponse({ status: 404, description: 'Member not found.' })
  async removeMember(@Param('memberId') memberId: string, @Request() req) {
    return this.houseMembersService.removeMember(memberId, req.houseId);
  }
}
