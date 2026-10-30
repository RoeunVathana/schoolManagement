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
    const sent = await this.sendMessage('<b>✅ CampusFlow notifications connected</b>\n<i>Your Telegram reports are ready.</i>');
    if (!sent) throw new BadRequestException('Telegram notification could not be delivered. Check the bot token, chat ID and bot permissions.');
    return { sent: true };
  }

  async sendPaymentReport(input: { type: string; invoiceNumber: string; amount: string | number; currency: string; paymentPlan?: string; billingPeriod?: string | null; paidAt?: Date | string | null; courseName?: string; customerName?: string; customerEmail?: string; transactionHash?: string | null }) {
    const paidAt = input.paidAt ? new Date(input.paidAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Phnom_Penh' }) : 'Not available';
    const message = [
      '<b>💳 CAMPUSFLOW PAYMENT REPORT</b>',
      '<i>━━━━━━━━━━━━━━━━━━━━</i>',
      '',
      '<b>✅ Status</b>  <code>PAID</code>',
      `<b>📌 Type</b>  ${this.escapeHtml(input.type)}`,
      `<b>🧾 Invoice</b>  <code>${this.escapeHtml(input.invoiceNumber)}</code>`,
      '',
      '<b>ORDER DETAILS</b>',
      input.courseName ? `📚 <b>Course</b>  ${this.escapeHtml(input.courseName)}` : null,
      `💰 <b>Amount</b>  ${this.escapeHtml(input.amount)} ${this.escapeHtml(input.currency)}`,
      input.paymentPlan ? `🔁 <b>Plan</b>  ${this.escapeHtml(input.paymentPlan)}${input.billingPeriod ? ` <i>(${this.escapeHtml(input.billingPeriod)})</i>` : ''}` : null,
      '',
      '<b>CUSTOMER</b>',
      input.customerName ? `👤 <b>Name</b>  ${this.escapeHtml(input.customerName)}` : null,
      input.customerEmail ? `✉️ <b>Email</b>  ${this.escapeHtml(input.customerEmail)}` : null,
      `🕒 <b>Paid at</b>  ${this.escapeHtml(paidAt)}`,
      input.transactionHash ? `🔐 <b>Transaction</b>\n<code>${this.escapeHtml(input.transactionHash)}</code>` : null,
    ].filter(Boolean).join('\n');
    return this.sendMessage(message);
  }

  async sendTeacherAttendanceReport(input: { action: 'CHECK_IN' | 'CHECK_OUT'; teacherName: string; teacherCode?: string; attendanceDate: Date | string; checkInAt?: Date | string | null; checkOutAt?: Date | string | null; performedBy?: string; performedByRole?: string }) {
    const formatDateTime = (value?: Date | string | null) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Phnom_Penh' }) : 'Not recorded';
    const formatDate = (value?: Date | string | null) => value ? new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'Asia/Phnom_Penh' }) : 'Not available';
    const checkedIn = input.action === 'CHECK_IN';
    const actionLabel = checkedIn ? 'CHECKED IN' : 'CHECKED OUT';
    const statusIcon = checkedIn ? '🟢' : '🔵';
    const message = [
      '<b>🧑‍🏫 CAMPUSFLOW TEACHER ATTENDANCE</b>',
      '<i>━━━━━━━━━━━━━━━━━━━━</i>',
      '',
      `<b>${statusIcon} Status</b>  <code>${actionLabel}</code>`,
      `<b>👤 Teacher</b>  ${this.escapeHtml(input.teacherName)}${input.teacherCode ? `\n<code>${this.escapeHtml(input.teacherCode)}</code>` : ''}`,
      `<b>📅 Attendance date</b>  ${this.escapeHtml(formatDate(input.attendanceDate))}`,
      `⏱️ <b>Check in</b>  ${this.escapeHtml(formatDateTime(input.checkInAt))}`,
      `⏱️ <b>Check out</b>  ${this.escapeHtml(formatDateTime(input.checkOutAt))}`,
      input.performedBy ? `📝 <b>Recorded by</b>  ${this.escapeHtml(input.performedBy)}${input.performedByRole ? ` <i>(${this.escapeHtml(input.performedByRole)})</i>` : ''}` : null,
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
      const response = await fetch(`https://api.telegram.org/bot${current.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: current.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: controller.signal,
      });
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

  private escapeHtml(value: string | number) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
  }

  private maskToken(token: string) {
    if (!token) return '';
    if (token.length <= 10) return '••••••••';
    return `${token.slice(0, 5)}•••••••${token.slice(-4)}`;
  }
}
