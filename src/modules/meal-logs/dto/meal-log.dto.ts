import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDayMealDto {
  @ApiProperty({ example: '2026-05-09', description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: true, description: 'Toggle lunch ON (true) or OFF (false)' })
  @IsOptional()
  @IsBoolean()
  lunch?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Toggle dinner ON (true) or OFF (false)' })
  @IsOptional()
  @IsBoolean()
  dinner?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Number of lunch guests' })
  @IsOptional()
  @IsInt()
  @Min(0)
  guestLunch?: number;

  @ApiPropertyOptional({ example: 0, description: 'Number of dinner guests' })
  @IsOptional()
  @IsInt()
  @Min(0)
  guestDinner?: number;
}

export class UpdateDailyMealDto {
  @ApiProperty({ example: '2026-05-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  lunch: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  dinner: boolean;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  guestLunch: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  guestDinner: number;
}

export class BulkUpdateMealDto {
  @ApiProperty({ type: [UpdateDailyMealDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateDailyMealDto)
  meals: UpdateDailyMealDto[];
}

export class MealLogRangeQueryDto {
  @ApiProperty({ example: '2026-05-01', description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-31', description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;
}

export class MealLogMonthQueryDto {
  @ApiProperty({ example: '2026-05', description: 'Month in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;
}
