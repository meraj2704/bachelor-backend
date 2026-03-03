// src/modules/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err, user, info, context: ExecutionContext) {
        // Check what 'info' says in the terminal
        if (info) {
            console.log('Passport Debug Info:', info.message);
        }

        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}