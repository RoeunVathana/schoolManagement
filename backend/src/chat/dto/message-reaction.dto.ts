import { MessageReactionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class MessageReactionDto {
  @IsEnum(MessageReactionType)
  type!: MessageReactionType;
}
