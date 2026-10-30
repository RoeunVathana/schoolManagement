import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword@2026' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword@2026#Strong', minLength: 10 })
  @IsString()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' })
  newPassword!: string;
}
