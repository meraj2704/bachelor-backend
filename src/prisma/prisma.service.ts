import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg'; // pg প্যাকেজটি ইন্সটল থাকতে হবে

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // ১. কনফিগারেশন লগার এবং অ্যাডাপ্টার
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL as string,
      max: 20, // প্রয়োজন অনুযায়ী Pool size সেট করুন
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      // ২. প্রোডাকশনে শুধু এরর লগ করুন, ডেভেলপমেন্টে কুয়েরি লগ করুন
      log: process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'info', 'warn', 'error'],
    });
  }

  // ৩. অ্যাপ চালু হওয়ার সময় কানেকশন তৈরি করুন
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to the database', error);
      throw error;
    }
  }

  // ৪. অ্যাপ বন্ধ হওয়ার সময় কানেকশন বিচ্ছিন্ন করুন
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected successfully');
  }
}