import { IsString, IsNumber, Min, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepositDto {
  @ApiProperty({
    example: 'Paying May balance',
    description: 'Title/reason for the deposit',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    example: 'cmmdwm70v000079kcbsypwf5n',
    description: 'User ID of the member who is making the deposit (paying extra money)',
  })
  @IsString()
  from: string;

  @ApiProperty({
    example: '2026-05',
    description: 'Settlement month this deposit belongs to (YYYY-MM)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;

  @ApiProperty({
    example: 5000,
    description: 'Amount of money being deposited (in currency units)',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
