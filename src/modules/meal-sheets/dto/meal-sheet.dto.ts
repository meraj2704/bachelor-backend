import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
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

export class MealSheetMonthQueryDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;
}

export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export class MealSheetExportQueryDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.PDF })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.PDF;
}

export class UpdateCellDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '2026-05-12' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lunch?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dinner?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  guestLunch?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  guestDinner?: number;

  @ApiPropertyOptional({ description: 'Bypass deadline rule (manager only). Does not bypass month-lock.' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class BulkCellDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: '2026-05-12' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lunch?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dinner?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  guestLunch?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  guestDinner?: number;
}

export class BulkUpdateSheetDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiProperty({ type: [BulkCellDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkCellDto)
  cells: BulkCellDto[];
}

export class LockMonthDto {
  @ApiProperty({ example: '2026-05' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;
}
