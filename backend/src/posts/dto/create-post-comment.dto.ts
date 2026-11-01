import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostCommentDto {
  @ApiProperty({ example: 'Great progress. Keep going!' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
