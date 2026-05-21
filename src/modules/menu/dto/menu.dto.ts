import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../menu.enums.js';

export class MenuDayDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.SATURDAY })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: 'Chicken Curry & Dal' })
  @IsString()
  @MaxLength(200)
  lunch: string;

  @ApiProperty({ example: 'Egg Bhuna & Rice' })
  @IsString()
  @MaxLength(200)
  dinner: string;
}

export class UpdateMenuDto {
  @ApiProperty({ type: [MenuDayDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => MenuDayDto)
  days: MenuDayDto[];
}
