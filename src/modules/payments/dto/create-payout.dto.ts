import { IsString, IsNumber, IsOptional, IsEnum, IsUUID, Min, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutCategory } from '../payments.enums.js';

export class CreatePayoutDto {
  @ApiProperty({
    example: 'Gas bill for May',
    description: 'Title/reason for the payout',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    enum: PayoutCategory,
    example: PayoutCategory.GAS_BILL,
    description:
      'Category of payout. For house bills (GAS_BILL, ELECTRICITY, etc.) `to` is not required. For MEMBER_REFUND `to` is required.',
  })
  @IsEnum(PayoutCategory)
  category: PayoutCategory;

  @ApiPropertyOptional({
    example: 'cmme2fjqy0000y5kc0plmhpel',
    description: 'User ID of the member receiving the refund. Required only when category is MEMBER_REFUND.',
  })
  @ValidateIf((o) => o.category === PayoutCategory.MEMBER_REFUND)
  @IsString()
  to?: string;

  @ApiProperty({
    example: 2000,
    description: 'Amount being paid out (in currency units)',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: '2026-05',
    description: 'Settlement month this payout belongs to (YYYY-MM)',
  })
  @IsOptional()
  @IsString()
  month?: string;
}
