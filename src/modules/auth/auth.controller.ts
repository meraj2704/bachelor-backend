import {
  Controller,
  Post,
  Body,
  ConflictException,
  BadRequestException,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register-manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new manager and create a house' })
  @ApiCreatedResponse({ description: 'Manager and House successfully created.' })
  @ApiConflictResponse({ description: 'User with this email already exists.' })
  async registerManager(@Body() dto: RegisterManagerDto) {
    const userExistWithEmail = await this.authService.findUserWithEmail(dto.email);
    if (userExistWithEmail) {
      throw new ConflictException('User with this email already exists');
    }
    return this.authService.registerManager(dto);
  }

  @Post('register-member')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new member using an invitation code' })
  @ApiCreatedResponse({ description: 'Member successfully registered and joined the house.' })
  @ApiBadRequestResponse({ description: 'Invalid invitation code provided.' })
  @ApiConflictResponse({ description: 'User with this email already exists.' })
  async registerMember(@Body() dto: RegisterMemberDto) {
    const userExistWithEmail = await this.authService.findUserWithEmail(dto.email);
    if (userExistWithEmail) {
      throw new ConflictException('User with this email already exists');
    }
    const house = await this.authService.findHouseWithId(dto.inviteCode);
    if (!house) {
      throw new BadRequestException('Invalid invitation code!');
    }
    return this.authService.registerMember(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login to receive JWT token' })
  @ApiOkResponse({ description: 'Login successful, returns user info and tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}