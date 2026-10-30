import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export const PUBLIC_REGISTRATION_ROLES = [Role.STUDENT, Role.CUSTOMER] as const;

export class RegisterDto {
  @ApiProperty({ enum: PUBLIC_REGISTRATION_ROLES, description: 'Public accounts can only be STUDENT or CUSTOMER.' })
  @IsIn(PUBLIC_REGISTRATION_ROLES, { message: 'Public registration only allows STUDENT or CUSTOMER.' })
  accountType!: Role;

  @ApiProperty({ example: 'jane_doe' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Student@2026#Strong', minLength: 10 })
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' })
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional({ example: '+855 12 345 678' })
  @IsOptional()
  @IsString()
  phone?: string;
}
