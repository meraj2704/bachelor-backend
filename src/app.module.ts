import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module.js';
import { AppController } from './app.controller.js';
import { UserService } from './modules/users/users.service.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AuthModule } from './modules/auth/auth.module.js';


@Module({
  imports: [UsersModule, AuthModule],
  controllers: [AppController],
  providers: [AppService,UserService,PrismaService],
})
export class AppModule {}
