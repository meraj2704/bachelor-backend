import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFixedCostDto {

    @ApiProperty({ example: 5000, description: 'Monthly room rent' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    roomRent: number = 0;

    @ApiProperty({ example: 500, description: 'Khala/Maid bill' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    khalaBill: number = 0;

    @ApiProperty({ example: 200, description: 'WiFi/Internet bill' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    wifiBill: number = 0;

    @ApiProperty({ example: 300, description: 'Electricity bill' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    electricity: number = 0;

    @ApiProperty({ example: 150, description: 'Gas bill' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    gasBill: number = 0;

    @ApiProperty({ example: 100, description: 'Water bill' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    waterBill: number = 0;

    @ApiProperty({ example: 0, description: 'Miscellaneous bills' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Transform(({ value }) => Number(value))
    otherBill: number = 0;
}