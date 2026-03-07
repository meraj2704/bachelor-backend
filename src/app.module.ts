import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <-- add this
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserService } from './modules/users/users.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { HouseMembersModule } from './modules/house-members/house-members.module.js';
import { FixedCostsModule } from './modules/fixed-costs/fixed-costs.module.js';
import { BazarModule } from './modules/bazar/bazar.module.js';
import { MealLogsModule } from './modules/meal-logs/meal-logs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- load .env globally
    UsersModule,
    AuthModule,
    HouseMembersModule,
    FixedCostsModule,
    BazarModule,
    MealLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService, PrismaService],
})
export class AppModule { }