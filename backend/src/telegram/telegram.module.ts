import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramService } from './telegram.service';

@Module({ controllers: [TelegramController, TelegramWebhookController], providers: [TelegramService], exports: [TelegramService] })
export class TelegramModule {}
