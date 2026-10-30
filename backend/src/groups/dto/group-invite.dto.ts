import { IsString, MinLength } from 'class-validator';

export class GroupInviteDto {
  @IsString()
  @MinLength(1)
  inviteeId!: string;
}
