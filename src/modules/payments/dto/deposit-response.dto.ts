import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty({ example: 'cmmdwm70v000079kcbsypwf5n' })
  id: string;

  @ApiProperty({ example: 'Meraj' })
  firstName: string;

  @ApiProperty({ example: 'Hossain' })
  lastName: string;
}

export class DepositResponseDto {
  @ApiProperty({ example: 'deposit-123' })
  id: string;

  @ApiProperty({ example: 'Extra payment for May settlement' })
  title: string;

  @ApiProperty({ type: UserDto })
  from: UserDto;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: '2026-05-12T10:30:00Z' })
  date: Date;
}

export class DepositListResponseDto {
  @ApiProperty({ type: [DepositResponseDto] })
  data: DepositResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number', example: 25 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 50 },
      lastPage: { type: 'number', example: 1 },
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}
