import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramWebhookController {
  constructor(private readonly telegram: TelegramService, private readonly config: ConfigService) {}

  @Post('webhook')
  @HttpCode(200)
  async receive(@Headers('x-telegram-bot-api-secret-token') secretToken: string | undefined, @Body() update: any) {
    const expectedSecret = String(this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '') || '').trim();
    const nodeEnv = String(this.config.get<string>('NODE_ENV', 'development')).toLowerCase();
    if (!expectedSecret || secretToken !== expectedSecret) {
      if (nodeEnv === 'production' || expectedSecret) throw new UnauthorizedException('Invalid Telegram webhook secret.');
    }
    return this.telegram.handleWebhook(update);
  }
}
