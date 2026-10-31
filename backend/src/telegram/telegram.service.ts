import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type TelegramConfig = { botToken: string; chatId: string; enabled: boolean };
type TeacherMeetingAlert = { botToken: string; chatId: string; action: 'CHECK_IN' | 'CHECK_OUT' | 'UPDATE' | 'DELETE'; teacherName: string; courseName?: string; meetingUrl?: string | null; attendanceDate: Date | string; checkInAt?: Date | string | null; checkOutAt?: Date | string | null };

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

  async teacherSettings(teacherId: string) {
    const setting = await this.prisma.teacherTelegramSetting.findUnique({ where: { teacherId } });
    return { configured: Boolean(setting?.botToken && setting?.chatId), enabled: setting?.enabled ?? true, botToken: setting ? this.maskToken(setting.botToken) : '', chatId: setting?.chatId || '' };
  }

  async saveTeacherSettings(teacherId: string, input: { botToken?: string; chatId?: string; enabled?: boolean }) {
    const current = await this.prisma.teacherTelegramSetting.findUnique({ where: { teacherId } });
    const botToken = String(input.botToken || '').trim() || current?.botToken || '';
    const chatId = String(input.chatId || '').trim() || current?.chatId || '';
    if (!botToken || !chatId) throw new BadRequestException('Please provide the Telegram bot token and group chat ID.');
    await this.prisma.teacherTelegramSetting.upsert({ where: { teacherId }, update: { botToken, chatId, enabled: input.enabled !== false }, create: { teacherId, botToken, chatId, enabled: input.enabled !== false } });
    return this.teacherSettings(teacherId);
  }

  async testTeacherSettings(teacherId: string) {
    const setting = await this.prisma.teacherTelegramSetting.findUnique({ where: { teacherId } });
    if (!setting?.enabled || !setting.botToken || !setting.chatId) throw new BadRequestException('Please save the teacher Telegram settings first.');
    const sent = await this.sendMessageWithConfig(setting.botToken, setting.chatId, '<b>CampusFlow teacher Telegram connected</b>\n<i>Google Meet check-in alerts are ready.</i>');
    if (!sent) throw new BadRequestException('Telegram test failed. Check the bot token, group chat ID and bot permissions.');
    return { sent: true };
  }

  async sendTeacherMeetingAlert(input: TeacherMeetingAlert) {
    const formatDateTime = (value?: Date | string | null) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Phnom_Penh' }) : 'Not recorded';
    const started = input.action === 'CHECK_IN';
    const updated = input.action === 'UPDATE';
    const deleted = input.action === 'DELETE';
    const message = [
      `<b>CampusFlow ${started ? 'class started' : deleted ? 'Google Meet deleted' : updated ? 'Google Meet updated' : 'class ended'}</b>`,
      `<b>Teacher:</b> ${this.escapeHtml(input.teacherName)}`,
      input.courseName ? `<b>Course:</b> ${this.escapeHtml(input.courseName)}` : null,
      `<b>Date:</b> ${this.escapeHtml(String(input.attendanceDate).slice(0, 10))}`,
      `<b>Check-in:</b> ${this.escapeHtml(formatDateTime(input.checkInAt))}`,
      `<b>Check-out:</b> ${this.escapeHtml(formatDateTime(input.checkOutAt))}`,
      !deleted && input.meetingUrl ? `<b>Google Meet:</b> ${this.escapeHtml(input.meetingUrl)}` : null,
      started ? '<i>Students can join using the Meet link above.</i>' : updated ? '<i>The updated link is ready for the class.</i>' : deleted ? '<i>The Google Meet link was removed from CampusFlow.</i>' : '<i>This class meeting is now inactive in CampusFlow.</i>',
    ].filter(Boolean).join('\n');
    return this.sendMessageWithConfig(input.botToken, input.chatId, message);
  }

  async sendTestMessage() {
    const sent = await this.sendMessage('<b>✅ CampusFlow notifications connected</b>\n<i>Your Telegram reports are ready.</i>');
    if (!sent) throw new BadRequestException('Telegram notification could not be delivered. Check the bot token, chat ID and bot permissions.');
    return { sent: true };
  }

  async sendDocument(input: { buffer: Buffer; fileName: string; mimeType?: string; caption?: string }) {
    const current = await this.resolveConfig();
    if (!current.enabled || !current.botToken || !current.chatId) {
      return { sent: false, reason: 'Telegram is not configured or is disabled.' };
    }

    const form = new FormData();
    form.append('chat_id', current.chatId);
    if (input.caption) form.append('caption', input.caption.slice(0, 1024));
    form.append('document', new Blob([new Uint8Array(input.buffer)], { type: input.mimeType || 'application/octet-stream' }), input.fileName);

    const controller = new AbortController();
    const timeoutMs = Math.max(30_000, Number(this.config.get('TELEGRAM_UPLOAD_TIMEOUT_MS') || 600_000));
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`https://api.telegram.org/bot${current.botToken}/sendDocument`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      const result: any = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram returned HTTP ${response.status}`);
      return {
        sent: true,
        messageId: result.result?.message_id as number | undefined,
        fileId: result.result?.document?.file_id as string | undefined,
      };
    } catch (error) {
      this.logger.warn(`Telegram document upload failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { sent: false, reason: error instanceof Error ? error.message : 'Telegram document upload failed.' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendMediaRetentionReport(input: { reason: string; archived: number; skipped: number; failed: number; bytesFreed: number }) {
    const bytes = input.bytesFreed >= 1024 ** 3
      ? `${(input.bytesFreed / 1024 ** 3).toFixed(2)} GB`
      : `${(input.bytesFreed / 1024 ** 2).toFixed(2)} MB`;
    return this.sendMessage([
      '<b>CampusFlow media archive completed</b>',
      `<b>Reason:</b> ${this.escapeHtml(input.reason)}`,
      `<b>Archived:</b> ${input.archived}`,
      `<b>Skipped:</b> ${input.skipped}`,
      `<b>Failed:</b> ${input.failed}`,
      `<b>Storage freed:</b> ${this.escapeHtml(bytes)}`,
    ].join('\n'));
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
    return this.sendMessageWithConfig(current.botToken, current.chatId, text);
  }

  private async sendMessageWithConfig(botToken: string, chatId: string, text: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
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
