import { Controller, Get, Post, Body, Patch, Param, Delete, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register-manager')
  async registerManager(@Body() dto: RegisterManagerDto) {
    const userExistWithEmail = await this.authService.findUserWithEmail(dto.email);
    if (userExistWithEmail) {
      throw new ConflictException('User with this email already exists')
    }
    return this.authService.registerManager(dto);
  }

  @Post('register-member')
  async registerMember(@Body() dto: RegisterMemberDto) {
    const userExistWithEmail = await this.authService.findUserWithEmail(dto.email);
    if (userExistWithEmail) {
      throw new ConflictException('User with this email already exists')
    }
    const house = await this.authService.findHouseWithId(dto.inviteCode)
    if (!house) {
      throw new BadRequestException('Invalid invitation code!')
    }
    return this.authService.registerMember(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
