import { Controller, Get, Body, Patch, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { UserService } from './users.service.js';

class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiOkResponse({ description: 'Return current user data without password.' })
  async getMe(@GetUser('id') userId: string) {
    return this.userService.getMe(userId);
  }

  @Patch('update-me')
  @ApiOperation({ summary: 'Update profile information' })
  async updateMe(
    @GetUser('id') userId: string,
    @Body() data: any
  ) {
    return this.userService.updateUser(userId, data);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change account password' })
  @ApiBody({ schema: { properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Password updated successfully.' })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get personal stats: total meals and total deposited' })
  @ApiOkResponse({ description: 'Returns totalMeals and totalDeposited for the current user.' })
  async getMyStats(@GetUser('id') userId: string) {
    return this.userService.getMyStats(userId);
  }
}