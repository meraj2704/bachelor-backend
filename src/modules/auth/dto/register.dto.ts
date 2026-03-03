import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

class RegisterBaseDto {
    @ApiProperty({
        example: 'john.doe@example.com',
        description: 'Unique email address of the user',
        format: 'email'
    })
    @IsEmail()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiProperty({
        example: 'Password123',
        description: 'Password must be at least 6 characters long',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John', description: 'User first name' })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'User last name' })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    lastName: string;
}

export class RegisterManagerDto extends RegisterBaseDto {
    @ApiProperty({
        example: 'Bachelor Paradise',
        description: 'The name of the house/mess being managed'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    houseName: string;
}

export class RegisterMemberDto extends RegisterBaseDto {
    @ApiProperty({
        example: 'HOUSE_123_ABC',
        description: 'The unique invite code to join a specific house'
    })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim())
    inviteCode: string;
}

export class LoginDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @IsNotEmpty()
    password: string;
}