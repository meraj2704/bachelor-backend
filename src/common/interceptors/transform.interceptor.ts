import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(
            map((data) => ({
                success: true,
                statusCode: context.switchToHttp().getResponse().statusCode,
                message: data.message || 'Request successful',
                data: data.result || data, // Handles cases where you pass a message vs raw data
            })),
        );
    }
}