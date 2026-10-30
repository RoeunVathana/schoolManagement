import { IsEnum, IsOptional } from 'class-validator';
import { PostReactionType } from '@prisma/client';

export class PostReactionDto {
  @IsOptional()
  @IsEnum(PostReactionType)
  type?: PostReactionType = PostReactionType.LIKE;
}
