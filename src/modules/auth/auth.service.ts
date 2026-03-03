import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) { }

  // ১. কমন টোকেন জেনারেটর
  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
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
  private async getAuthResponse(user: any) {
    const tokens = await this.generateTokens(user.id, user.email);
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async findUserWithEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findHouseWithId(id: string) {
    return this.prisma.house.findUnique({ where: { id } });
  }

  async registerManager(dto: RegisterManagerDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

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
          managerId: user.id
        }
      });

      await tx.houseMember.create({
        data: {
          houseId: house.id,
          userId: user.id,
          role: 'MANAGER'
        }
      });

      const authData = await this.getAuthResponse(user);
      return { ...authData, house };
    });
  }

  async registerMember(dto: RegisterMemberDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        }
      });

      await tx.houseMember.create({
        data: {
          houseId: dto.inviteCode,
          userId: user.id,
          role: 'MEMBER',
        },
      });

      return this.getAuthResponse(user);
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.getAuthResponse(user);
  }
}