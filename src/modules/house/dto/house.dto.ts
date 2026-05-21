import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateHouseDto {
  @ApiPropertyOptional({ example: 'Dhaka Bachelor Home', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Mirpur-10, Dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class MealSystemDto {
  @ApiProperty({ example: true, description: 'Enable or disable the meal system' })
  @IsBoolean()
  isMealSystemActive: boolean;
}

export class TransferManagerDto {
  @ApiProperty({
    example: 'cmme2fjqy0000y5kc0plmhpel',
    description: 'User ID of the member to become the new manager',
  })
  @IsString()
  newManagerUserId: string;
}
