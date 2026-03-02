import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UserService } from './users.service.js';

import { PrismaService } from '../../prisma/prisma.service.js';

@Module({
  imports: [], // Remove PrismaService from here - imports should be empty or only contain other modules
  controllers: [UsersController],
  providers: [UserService, PrismaService], // ✅ Add PrismaService here
  exports: [UserService],
})
export class UsersModule { }