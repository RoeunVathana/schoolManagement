import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostCommentDto {
  @ApiProperty({ example: 'Great progress. Keep going!' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @ApiProperty({ required: false, description: 'Top-level comment ID when this is a reply.' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
