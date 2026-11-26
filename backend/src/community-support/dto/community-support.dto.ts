import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class CommunitySupportHistoryDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'How do I buy a course?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;
}

export class CommunitySupportDto {
  @ApiProperty({ example: 'How do I buy a course?' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  question!: string;

  @ApiPropertyOptional({ enum: ['en', 'km'] })
  @IsOptional()
  @IsIn(['en', 'km'])
  language?: 'en' | 'km';

  @ApiPropertyOptional({ type: [CommunitySupportHistoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommunitySupportHistoryDto)
  history?: CommunitySupportHistoryDto[];
}
