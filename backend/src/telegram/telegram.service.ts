import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type TelegramConfig = { botToken: string; chatId: string; enabled: boolean };

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async resolveConfig(): Promise<TelegramConfig> {
    const stored = await this.prisma.telegramSetting.findUnique({ where: { id: 'telegram' } });
    return {
      botToken: stored?.botToken || this.config.get<string>('TELEGRAM_BOT_TOKEN', '') || '',
      chatId: stored?.chatId || this.config.get<string>('TELEGRAM_CHAT_ID', '') || '',
      enabled: stored?.enabled ?? this.config.get<string>('TELEGRAM_ENABLED', 'true') === 'true',
    };
  }

  async publicSettings() {
    const current = await this.resolveConfig();
    return { configured: Boolean(current.botToken && current.chatId), enabled: current.enabled, botToken: this.maskToken(current.botToken), chatId: current.chatId };
  }

  async saveSettings(input: { botToken?: string; chatId?: string; enabled?: boolean }) {
    const current = await this.resolveConfig();
    const botToken = String(input.botToken || '').trim() || current.botToken;
    const chatId = String(input.chatId || '').trim() || current.chatId;
    if (!botToken || !chatId) throw new BadRequestException('Please provide both the Telegram bot token and chat ID.');
    await this.prisma.telegramSetting.upsert({ where: { id: 'telegram' }, update: { botToken, chatId, enabled: input.enabled !== false }, create: { id: 'telegram', botToken, chatId, enabled: input.enabled !== false } });
    return this.publicSettings();
  }

  async sendTestMessage() {
    const sent = await this.sendMessage('CampusFlow Telegram notification is connected successfully.');
    if (!sent) throw new BadRequestException('Telegram notification could not be delivered. Check the bot token, chat ID and bot permissions.');
    return { sent: true };
  }

  async sendPaymentReport(input: { type: string; invoiceNumber: string; amount: string | number; currency: string; paymentPlan?: string; billingPeriod?: string | null; paidAt?: Date | string | null; courseName?: string; customerName?: string; customerEmail?: string; transactionHash?: string | null }) {
    const paidAt = input.paidAt ? new Date(input.paidAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Phnom_Penh' }) : '—';
    const message = [
      '💰 CampusFlow payment report',
      'Status: PAID',
      `Type: ${input.type}`,
      `Invoice: ${input.invoiceNumber}`,
      `Amount: ${input.amount} ${input.currency}`,
      input.paymentPlan ? `Payment plan: ${input.paymentPlan}${input.billingPeriod ? ` (${input.billingPeriod})` : ''}` : null,
      input.courseName ? `Course: ${input.courseName}` : null,
      input.customerName ? `Customer: ${input.customerName}` : null,
      input.customerEmail ? `Email: ${input.customerEmail}` : null,
      `Paid at: ${paidAt}`,
      input.transactionHash ? `Transaction: ${input.transactionHash}` : null,
    ].filter(Boolean).join('\n');
    return this.sendMessage(message);
  }

  private async sendMessage(text: string) {
    const current = await this.resolveConfig();
    if (!current.enabled || !current.botToken || !current.chatId) {
      this.logger.warn('Telegram notification skipped because it is not configured or disabled.');
      return false;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.telegram.org/bot${current.botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: current.chatId, text, disable_web_page_preview: true }), signal: controller.signal });
      const result: any = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}`);
      return true;
    } catch (error) {
      this.logger.warn(`Telegram notification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private maskToken(token: string) {
    if (!token) return '';
    if (token.length <= 10) return '••••••••';
    return `${token.slice(0, 5)}••••••••${token.slice(-4)}`;
  }
}
