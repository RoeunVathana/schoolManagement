import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({ imports: [MailModule, NotificationsModule], controllers: [ChatController], providers: [ChatService] })
export class ChatModule {}
