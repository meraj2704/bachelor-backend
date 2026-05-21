import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

// Vercel (and most serverless platforms) have a read-only filesystem, so a
// file-based log transport crashes on startup trying to create `logs/`.
// Console output is captured by the platform's log viewer anyway.
const isServerless = Boolean(process.env.VERCEL);

export const loggerConfig = {
    transports: [
        // Console transport — always on; the platform captures stdout/stderr.
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
        // File transport (errors only) — only where the filesystem is writable.
        ...(isServerless
            ? []
            : [
                new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
            ]),
    ],
};
