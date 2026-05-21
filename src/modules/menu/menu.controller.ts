import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ManagerGuard } from '../../common/guards/manager.guard.js';
import { MenuService } from './menu.service.js';
import { UpdateMenuDto } from './dto/menu.dto.js';

@ApiTags('Mess Menu')
@ApiBearerAuth('JWT-auth')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get the weekly mess menu for the current user\'s house',
  })
  async getMenu(@Request() req) {
    const houseId =
      req.user?.managedHouse?.id || req.user?.membership?.houseId;
    if (!houseId) {
      throw new BadRequestException('User is not associated with any house.');
    }
    return this.menuService.getMenu(houseId);
  }

  @Put()
  @UseGuards(JwtAuthGuard, ManagerGuard)
  @ApiOperation({
    summary: 'Update the weekly mess menu (manager only)',
  })
  async updateMenu(@Request() req, @Body() dto: UpdateMenuDto) {
    return this.menuService.updateMenu(req.houseId, dto, req.user.id);
  }
}
