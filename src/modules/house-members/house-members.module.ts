import { Module } from '@nestjs/common';
import { HouseMembersService } from './house-members.service.js';
import { HouseMembersController } from './house-members.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Module({
  controllers: [HouseMembersController],
  providers: [HouseMembersService, PrismaService],
})
export class HouseMembersModule { }
