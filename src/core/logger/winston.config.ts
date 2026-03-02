import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export const loggerConfig = {
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.ms(),
                // Correct usage of nest-winston utilities
                nestWinstonModuleUtilities.format.nestLike('MyApp', {
                    colors: true,
                    prettyPrint: true,
                }),
            ),
        }),
        // File transport for production (errors only)
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
    ],
};