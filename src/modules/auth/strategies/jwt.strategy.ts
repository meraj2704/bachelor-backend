// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config'; // Import this
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService // Inject ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Use configService instead of process.env
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: { sub: string; email: string; houseId: string; tokenVersion?: number }) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                membership: true,
                managedHouse: true
            }
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated.');
        }

        if (
            payload.tokenVersion !== undefined &&
            user.tokenVersion !== payload.tokenVersion
        ) {
            throw new UnauthorizedException('Token has been invalidated. Please log in again.');
        }

        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}