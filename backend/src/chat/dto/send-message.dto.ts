import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hi! Are you joining the next class?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}
