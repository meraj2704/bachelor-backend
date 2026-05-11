import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsString,
    IsEnum,
    IsDateString,
    IsOptional,
    Min,
    MinLength,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import { ExpenseUnit } from '../../../generated/prisma/enums.js';
import { BazarCategory } from '../bazar.enums.js';

export class CreateBazarDto {
    @ApiProperty({ example: 'Beef', minLength: 3, maxLength: 50 })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    title: string;

    @ApiProperty({ example: 1250.5 })
    @IsNumber()
    @IsNotEmpty()
    @Min(0.01)
    amount: number;

    @ApiProperty({ example: '2026-05-09T00:00:00.000Z' })
    @IsDateString()
    @IsNotEmpty()
    expenseDate: string;

    @ApiPropertyOptional({ example: 2.5, description: 'Quantity purchased' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    quantity?: number;

    @ApiPropertyOptional({
        enum: ExpenseUnit,
        example: ExpenseUnit.KG,
        description: 'Required if quantity is present',
    })
    @ValidateIf((o) => o.quantity !== undefined && o.quantity !== null)
    @IsEnum(ExpenseUnit)
    unit?: ExpenseUnit;

    @ApiProperty({ enum: BazarCategory, example: BazarCategory.MEAT })
    @IsEnum(BazarCategory)
    category: BazarCategory;
}
