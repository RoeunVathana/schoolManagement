import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class CreateStoryDto {
  @ApiPropertyOptional({ example: 'Learning something new today.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @ApiPropertyOptional({ enum: PostVisibility, default: PostVisibility.FRIENDS_ONLY })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility = PostVisibility.FRIENDS_ONLY;
}
