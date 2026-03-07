import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBazarDto {
    @ApiPropertyOptional({ example: '2026-03', description: 'Filter by Year-Month' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
    month?: string;

    @ApiPropertyOptional({ example: 'Chicken', description: 'Search by title' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, description: 'Items per page' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}