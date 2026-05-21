import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HouseController } from './house.controller.js';
import { HouseService } from './house.service.js';

@Module({
  controllers: [HouseController],
  providers: [HouseService, PrismaService],
})
export class HouseModule {}
