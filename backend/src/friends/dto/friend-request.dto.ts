import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FriendRequestDto {
  @ApiProperty({ description: 'User ID of the person who should receive the request.' })
  @IsString()
  @MinLength(1)
  receiverId!: string;
}
