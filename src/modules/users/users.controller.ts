import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { UserService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth') // Swagger-এ লক আইকন দেখাবে
@UseGuards(JwtAuthGuard)     // এই কন্ট্রোলার প্রোটেক্টেড
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
    @Body() data: any // এখানে আপনার UpdateUserDto ব্যবহার করা উচিত
  ) {
    return this.userService.updateUser(userId, data);
  }
}