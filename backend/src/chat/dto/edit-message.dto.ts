import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({ example: 'Updated message text' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}
