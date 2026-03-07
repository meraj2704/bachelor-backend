import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  BadRequestException,
  Query
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam
} from '@nestjs/swagger';
import { BazarService } from './bazar.service.js';
import { CreateBazarDto } from './dto/create-bazar.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { QueryBazarDto } from './dto/query-bazar.dto.js';

@ApiTags('Bazar & Expenses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bazar')
export class BazarController {
  constructor(private readonly bazarService: BazarService) { }

  @Post('add')
  @ApiOperation({
    summary: 'Create a new Bazar entry',
    description: 'Logs a meal-related expense. The houseId and creatorId are extracted from the token.'
  })
  @ApiResponse({ status: 201, description: 'Bazar entry created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async create(@Body() createBazarDto: CreateBazarDto, @Request() req) {
    // Extract houseId from the user's managed house or their assigned house
    const houseId = req.user?.managedHouse?.id || req.user?.membership?.houseId;
    const creatorId = req.user.id;

    if (!houseId) {
      throw new BadRequestException('User is not associated with any house.');
    }

    return this.bazarService.create(createBazarDto, houseId, creatorId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all bazar entries for the house' })
  async findAll(@Request() req, @Query() query: QueryBazarDto) {
    const houseId = req.user?.managedHouse?.id || req.user?.houseId;
    return this.bazarService.findAll(houseId, query);
  }

  @Get('all/for-me')
  @ApiOperation({ summary: 'Get all bazar entries for me' })
  async findAllForMe(@Request() req, @Query() query: QueryBazarDto) {
    const userId = req.user?.id;
    return this.bazarService.findAllForMe(userId, query);
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a specific bazar entry by ID' })
  // @ApiParam({ name: 'id', description: 'The unique ID of the expense' })
  // async findOne(@Param('id') id: string, @Request() req) {
  //   const houseId = req.user?.managedHouse?.id || req.user?.houseId;
  //   return this.bazarService.findOne(id, houseId);
  // }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update an existing bazar entry' })
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateBazarDto: UpdateBazarDto,
  //   @Request() req
  // ) {
  //   const houseId = req.user?.managedHouse?.id || req.user?.houseId;
  //   const updaterId = req.user.id;
  //   return this.bazarService.update(id, updateBazarDto, houseId, updaterId);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a bazar entry' })
  // @ApiResponse({ status: 200, description: 'Entry removed.' })
  // async remove(@Param('id') id: string, @Request() req) {
  //   const houseId = req.user?.managedHouse?.id || req.user?.houseId;
  //   return this.bazarService.remove(id, houseId);
  // }
}