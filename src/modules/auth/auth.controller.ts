import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register-manager')
  registerManager(@Body() dto: RegisterManagerDto) {
    return this.authService.registerManager(dto);
  }

  @Post('register-member')
  registerMember(@Body() dto: RegisterMemberDto) {
    return this.authService.registerMember(dto);
  }


}
