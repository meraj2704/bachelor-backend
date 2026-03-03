import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal server error';
        let errorName = 'InternalServerError';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse() as any;
            message = res.message || exception.message;
            errorName = res.error || exception.name;
        } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            switch (exception.code) {
                case 'P2002':
                    // ফিল্ডের নাম বের করার আরও শক্তিশালী লজিক
                    let target = 'field';
                    if (exception.meta?.target) {
                        target = Array.isArray(exception.meta.target)
                            ? exception.meta.target.join(', ')
                            : (exception.meta.target as string);
                    } else if (exception.meta?.constraint) {
                        // অনেক সময় constraint নাম থেকে ফিল্ড বের করতে হয় (যেমন: user_email_key)
                        const constraint = exception.meta.constraint as string;
                        if (constraint.includes('email')) target = 'email';
                        if (constraint.includes('phone')) target = 'phone';
                    }

                    status = HttpStatus.CONFLICT;
                    message = `This ${target} already exists. Please use a different one.`;
                    errorName = 'ConflictError';
                    break;
                case 'P2003':
                    status = HttpStatus.BAD_REQUEST;
                    message = 'Related record not found.';
                    errorName = 'ReferenceError';
                    break;
                case 'P2025':
                    status = HttpStatus.NOT_FOUND;
                    message = 'Record not found in database.';
                    errorName = 'NotFoundError';
                    break;
                default:
                    status = HttpStatus.INTERNAL_SERVER_ERROR;
                    message = `Database Error: ${exception.code}`;
                    errorName = 'DatabaseError';
                    break;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            errorName = exception.name;
        }

        this.logger.error(
            `[${request.method}] ${request.url} - Error: ${JSON.stringify(exception)}`,
        );

        response.status(status).json({
            success: false,
            statusCode: status,
            path: request.url,
            error: errorName,
            message:
                process.env.NODE_ENV === 'production' &&
                    status === HttpStatus.INTERNAL_SERVER_ERROR
                    ? 'An unexpected error occurred'
                    : Array.isArray(message)
                        ? message.join(', ')
                        : message,
            timestamp: new Date().toISOString(),
        });
    }
}