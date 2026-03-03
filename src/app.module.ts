import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <-- add this
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserService } from './modules/users/users.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- load .env globally
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService, PrismaService],
})
export class AppModule { }