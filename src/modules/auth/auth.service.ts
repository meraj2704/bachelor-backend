import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterManagerDto, RegisterMemberDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) { }


  async registerManager(dto: RegisterManagerDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10)
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

      return {
        user, house
      }
    })
  }

  async registerMember(dto: RegisterMemberDto) {
    const houseId = dto.inviteCode;
    const passwordHash = await bcrypt.hash(dto.password, 10)

    return this.prisma.$transaction(async (tx) => {

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        }
      })

      await tx.houseMember.create({
        data: {
          houseId: houseId,
          userId: user.id,
          role: 'MEMBER',
        },
      });

      return { user };
    })
  }

}
