import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityGroupVisibility } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Frontend Study Circle' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'A friendly space to practice frontend development together.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CommunityGroupVisibility })
  @IsOptional()
  @IsEnum(CommunityGroupVisibility)
  visibility?: CommunityGroupVisibility;
}
