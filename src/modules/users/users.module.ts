import { Module } from '@nestjs/common';
import { UserService } from './users.service.js';

import { PrismaService } from '../../prisma/prisma.service.js';
import { UserController } from './users.controller.js';

@Module({
  imports: [], // Remove PrismaService from here - imports should be empty or only contain other modules
  controllers: [UserController],
  providers: [UserService, PrismaService], // ✅ Add PrismaService here
  exports: [UserService],
})
export class UsersModule { }