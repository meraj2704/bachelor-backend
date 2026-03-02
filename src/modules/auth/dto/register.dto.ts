import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Common fields
class RegisterBaseDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    lastName: string;
}

// Manager Specific DTO
export class RegisterManagerDto extends RegisterBaseDto {
    @ApiProperty({ description: 'Name of the house to be created' })
    @IsString()
    @IsNotEmpty()
    houseName: string;
}

// Member Specific DTO
export class RegisterMemberDto extends RegisterBaseDto {
    @ApiProperty({ description: 'Invite code to join a house' })
    @IsString()
    @IsNotEmpty()
    inviteCode: string; // এখানে Invite Code দিয়ে HouseId বের করতে হবে
}