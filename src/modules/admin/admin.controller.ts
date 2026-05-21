import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard.js';
import { AdminService } from './admin.service.js';

class SetUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('Super Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform-wide stats and recent houses' })
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('houses')
  @ApiOperation({ summary: 'List every house on the platform' })
  getHouses() {
    return this.adminService.getHouses();
  }

  @Delete('houses/:id')
  @ApiOperation({ summary: 'Permanently delete a house and all its data' })
  deleteHouse(@Param('id') id: string) {
    return this.adminService.deleteHouse(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List every user on the platform' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  setUserStatus(
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @Request() req,
  ) {
    return this.adminService.setUserActive(id, dto.isActive, req.user.id);
  }
}
