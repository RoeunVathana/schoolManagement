import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations') list(@CurrentUser() user: { id: string }) { return this.chat.listConversations(user.id); }
  @Post('with/:userId') open(@CurrentUser() user: { id: string }, @Param('userId') userId: string) { return this.chat.openWith(user.id, userId); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.chat.listMessages(user.id, id); }
  @Post('conversations/:id/messages') send(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.chat.sendMessage(user.id, id, dto.body); }
  @Patch('messages/:messageId/reaction') react(@CurrentUser() user: { id: string }, @Param('messageId') messageId: string, @Body() dto: MessageReactionDto) { return this.chat.reactMessage(user.id, messageId, dto.type); }
  @Delete('messages/:messageId/reaction') removeReaction(@CurrentUser() user: { id: string }, @Param('messageId') messageId: string) { return this.chat.removeReaction(user.id, messageId); }
  @Patch('conversations/:id/read') read(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.chat.markRead(user.id, id); }
}
