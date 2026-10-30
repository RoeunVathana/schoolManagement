import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { ChatService } from './chat.service';
import { chatImageUpload } from '../common/upload.options';

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
  @Post('conversations/:id/images')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', chatImageUpload))
  sendImage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: { body?: string }, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Please select an image to send');
    return this.chat.sendImage(user.id, id, file, dto.body);
  }
  @Get('messages/:messageId/image')
  async downloadImage(@CurrentUser() user: { id: string }, @Param('messageId') messageId: string, @Res({ passthrough: true }) response: Response) {
    const image = await this.chat.getImageForDownload(user.id, messageId);
    response.setHeader('Content-Disposition', `attachment; filename="${image.fileName}"`);
    response.setHeader('Content-Type', image.contentType);
    return new StreamableFile(createReadStream(image.filePath));
  }
  @Patch('messages/:messageId/reaction') react(@CurrentUser() user: { id: string }, @Param('messageId') messageId: string, @Body() dto: MessageReactionDto) { return this.chat.reactMessage(user.id, messageId, dto.type); }
  @Delete('messages/:messageId/reaction') removeReaction(@CurrentUser() user: { id: string }, @Param('messageId') messageId: string) { return this.chat.removeReaction(user.id, messageId); }
  @Patch('conversations/:id/read') read(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.chat.markRead(user.id, id); }
}
