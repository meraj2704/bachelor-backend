import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) { }

  // ১. কমন টোকেন জেনারেটর
  private async generateTokens(userId: string, email: string, houseId: string, tokenVersion = 0) {
    const payload = { sub: userId, email, houseId, tokenVersion };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  // ২. পাসওয়ার্ড রিমুভ করার কমন মেথড
  private sanitizeUser(user: any) {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ৩. ইউজার এবং টোকেন একসাথে রিটার্ন করার কমন ফরম্যাট
  private async getAuthResponse(user: any, houseId: any) {
    const tokens = await this.generateTokens(user.id, user.email, houseId, user.tokenVersion ?? 0);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async findUserWithEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findHouseWithId(inviteCode: string) {
    // Match the invite code case-insensitively so copy/paste casing never matters.
    return this.prisma.house.findFirst({
      where: {
        inviteCode: { equals: inviteCode.trim(), mode: 'insensitive' },
      } as any,
    });
  }

  async registerManager(dto: RegisterManagerDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    console.log('hit')

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName
        }
      });

      const house = await tx.house.create({
        data: {
          name: dto.houseName,
          managerId: user.id,
          createdById: user.id
        }
      });

      await tx.houseMember.create({
        data: {
          houseId: house.id,
          userId: user.id,
          role: 'MANAGER'
        }
      });

      const authData = await this.getAuthResponse(user, house?.id);
      return { ...authData, house };
    });
  }

  async registerMember(dto: RegisterMemberDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const house = await this.prisma.house.findFirst({
      where: {
        inviteCode: { equals: dto.inviteCode.trim(), mode: 'insensitive' },
      } as any,
    });
    if (!house) throw new UnauthorizedException('Invalid invite code');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        }
      });

      const member = await tx.houseMember.create({
        data: {
          houseId: house.id,
          userId: user.id,
          role: 'MEMBER',
        },
        include: { house: true }
      });

      return this.getAuthResponse(user, member.house?.id);
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Signed out from all devices.' };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email }, include: {
        membership: true
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    return this.getAuthResponse(user, user?.membership?.houseId);
  }
}