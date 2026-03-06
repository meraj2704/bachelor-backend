
import { Controller, Get, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HouseMembersService } from './house-members.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'; // Adjust path

@ApiTags('House Members') // Groups these endpoints in Swagger UI
@ApiBearerAuth('JWT-auth')           // Adds the "Authorize" button in Swagger
@UseGuards(JwtAuthGuard)   // Requires a valid JWT token
@Controller('house-members')
export class HouseMembersController {
  constructor(private readonly houseMembersService: HouseMembersService) { }

  @Get('all')
  @ApiOperation({
    summary: 'Get all members of the current user\'s house',
    description: 'Extracts the houseId from the logged-in user\'s token and returns all members.'
  })
  @ApiResponse({ status: 200, description: 'Return list of members.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token missing or invalid.' })
  @ApiResponse({ status: 404, description: 'House not found for this user.' })
  async getHouseMembers(@Request() req) {
    const houseId = req.user.managedHouse.id;
    return this.houseMembersService.findAll(houseId);
  }

  @Patch(':memberId/status')
  @ApiOperation({
    summary: 'Toggle member activation status',
    description: 'Flips the isActive status. If deactivating, records leftDate; if activating, clears leftDate.'
  })
  @ApiParam({ name: 'memberId', description: 'The unique ID of the house member' })
  @ApiResponse({ status: 200, description: 'Member status toggled successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot toggle a Manager\'s status.' })
  @ApiResponse({ status: 404, description: 'Member not found in this house.' })
  async toggleStatus(
    @Param('memberId') memberId: string,
    @Request() req
  ) {
    // 1. Get house context from the Manager's JWT
    const houseId = req.user?.managedHouse?.id || req.user?.houseId;

    // 2. Execute the toggle logic in the service
    return this.houseMembersService.toggleMemberStatus(memberId, houseId);
  }
}