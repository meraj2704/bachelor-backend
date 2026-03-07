
import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsString,
    IsEnum,
    IsDateString,
    IsOptional,
    Min
} from 'class-validator';
import { ExpenseUnit } from '../../../generated/prisma/enums.js';



export class CreateBazarDto {
    @ApiProperty({ example: 'Grocery for Friday' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 1250.50 })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount: number;

    @ApiProperty({ example: '2026-03-07' })
    @IsDateString()
    @IsOptional()
    expenseDate?: string;

    @ApiProperty({ example: 2.5, description: 'The amount of the item purchased' })
    @IsNumber()
    @IsOptional()
    @Min(0)
    quantity?: number;

    @ApiProperty({
        enum: ExpenseUnit,
        example: ExpenseUnit.KG,
        description: 'The unit of measurement'
    })
    @IsEnum(ExpenseUnit)
    @IsOptional()
    unit?: ExpenseUnit;
}