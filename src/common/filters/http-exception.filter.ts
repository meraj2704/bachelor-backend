import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
// 1. Prisma থেকে এরর টাইপ ইমপোর্ট করুন (যদি প্রয়োজন হয়)
import { Prisma } from '../../generated/prisma/client.js'; 

@Catch() 
export class AllExceptionsFilter implements ExceptionFilter {
  // 2. Logger ইনজেক্ট করুন
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 3. Status Code নির্ধারণ
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 4. Message এবং Error Name নির্ধারণ
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      errorName = res.error || exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma-র সুনির্দিষ্ট এরর হ্যান্ডলিং (যেমন P2002: Unique Constraint)
      errorName = 'DatabaseError';
      message = `Database Error: ${exception.code}`; // প্রোডাকশনে এই কোডটি ম্যাপ করে কাস্টম মেসেজ দেওয়া ভালো
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    // 5. বিস্তারিত এরর সার্ভারে লগ করুন (উদ্ধারযোগ্য তথ্যের জন্য)
    this.logger.error(`[${request.method}] ${request.url} - Error: ${JSON.stringify(exception)}`);

    // 6. Perfect Response Format
    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url, 
      error: errorName,
      // 7. প্রোডাকশন নিরাপত্তা: বিস্তারিত মেসেজ লুকান
      message: process.env.NODE_ENV === 'production' 
        ? (status === HttpStatus.INTERNAL_SERVER_ERROR ? 'An unexpected error occurred' : message)
        : Array.isArray(message) ? message.join(', ') : message,
      timestamp: new Date().toISOString(),
    });
  }
}