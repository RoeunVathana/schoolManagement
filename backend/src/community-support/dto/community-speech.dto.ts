import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CommunitySpeechDto {
  @ApiProperty({ example: 'សួស្តី! ខ្ញុំអាចជួយអ្នកបាន។' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiPropertyOptional({ enum: ['en', 'km'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'km'])
  language?: 'en' | 'km';
}
