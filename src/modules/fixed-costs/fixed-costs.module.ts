import { Module } from '@nestjs/common';
import { FixedCostsController } from './fixed-costs.controller.js';
import { FixedCostsService } from './fixed-costs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';


@Module({
  controllers: [FixedCostsController],
  providers: [FixedCostsService, PrismaService],
})
export class FixedCostsModule { }
