import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    Max,
    Matches,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BazarCategory } from '../bazar.enums.js';

export enum BazarSortBy {
    EXPENSE_DATE = 'expenseDate',
    AMOUNT = 'amount',
    TITLE = 'title',
}

export enum BazarSortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class QueryBazarDto {
    @ApiPropertyOptional({ example: '2026-05', description: 'Filter by Year-Month' })
    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
    month: string;

    @ApiPropertyOptional({ example: 'Beef', description: 'Case-insensitive search on title' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 20, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ enum: BazarCategory })
    @IsOptional()
    @IsEnum(BazarCategory)
    category?: BazarCategory;

    @ApiPropertyOptional({ description: 'Filter by buyer' })
    @IsOptional()
    @IsString()
    payerId?: string;

    @ApiPropertyOptional({ enum: BazarSortBy, default: BazarSortBy.EXPENSE_DATE })
    @IsOptional()
    @IsEnum(BazarSortBy)
    sortBy?: BazarSortBy = BazarSortBy.EXPENSE_DATE;

    @ApiPropertyOptional({ enum: BazarSortOrder, default: BazarSortOrder.DESC })
    @IsOptional()
    @IsEnum(BazarSortOrder)
    order?: BazarSortOrder = BazarSortOrder.DESC;
}

export class MonthlySummaryQueryDto {
    @ApiPropertyOptional({ example: '2026-05' })
    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
    month: string;

    @ApiPropertyOptional({ enum: ['house', 'me'], default: 'house' })
    @IsOptional()
    @IsEnum(['house', 'me'] as any)
    scope?: 'house' | 'me' = 'house';
}

export class MonthlySettlementQueryDto {
    @ApiPropertyOptional({ example: '2026-05', description: 'Month in YYYY-MM format' })
    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
    month: string;
}
