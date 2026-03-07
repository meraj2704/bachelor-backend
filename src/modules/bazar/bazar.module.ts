import { PrismaService } from './../../prisma/prisma.service.js';
import { Module } from '@nestjs/common';
import { BazarService } from './bazar.service.js';
import { BazarController } from './bazar.controller.js';

@Module({
  controllers: [BazarController],
  providers: [BazarService, PrismaService],
})
export class BazarModule { }
