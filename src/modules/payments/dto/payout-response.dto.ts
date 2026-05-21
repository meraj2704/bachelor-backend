import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutCategory } from '../payments.enums.js';

class UserDto {
  @ApiProperty({ example: 'cmme2fjqy0000y5kc0plmhpel' })
  id: string;

  @ApiProperty({ example: 'Morshed' })
  firstName: string;

  @ApiProperty({ example: 'Munna' })
  lastName: string;
}

export class PayoutResponseDto {
  @ApiProperty({ example: 'transaction-456' })
  id: string;

  @ApiProperty({ example: 'Gas bill for May' })
  title: string;

  @ApiProperty({ enum: PayoutCategory, example: PayoutCategory.GAS_BILL })
  category: PayoutCategory;

  @ApiPropertyOptional({
    type: UserDto,
    description: 'Only present for MEMBER_REFUND payouts',
    nullable: true,
  })
  to: UserDto | null;

  @ApiProperty({ example: 2000 })
  amount: number;

  @ApiPropertyOptional({ example: '2026-05', description: 'Settlement month' })
  month: string | null;

  @ApiProperty({ example: '2026-05-12T10:30:00Z' })
  createdAt: Date;
}

export class PayoutListResponseDto {
  @ApiProperty({ type: [PayoutResponseDto] })
  data: PayoutResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number', example: 5 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 50 },
      lastPage: { type: 'number', example: 1 },
    },
  })
  meta: { total: number; page: number; limit: number; lastPage: number };
}
