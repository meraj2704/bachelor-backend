// meal-log.dto.ts
import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateDailyMealDto {
    @IsDateString()
    date: string;

    @IsBoolean()
    lunch: boolean;

    @IsBoolean()
    dinner: boolean;

    @IsInt()
    @Min(0)
    guestLunch: number;

    @IsInt()
    @Min(0)
    guestDinner: number;
}

export class BulkUpdateMealDto {
    @IsArray()
    @IsNotEmpty()
    meals: UpdateDailyMealDto[];
}