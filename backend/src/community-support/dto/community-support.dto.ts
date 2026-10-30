import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CommunitySupportDto {
  @ApiProperty({ example: 'How do I buy a course?' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  question!: string;
}
