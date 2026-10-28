import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST')?.trim();
    const user = this.config.get<string>('MAIL_USER')?.trim();
    // Gmail displays app passwords in groups separated by spaces. SMTP expects
    // the same 16 characters without those visual separators.
    const password = this.config.get<string>('MAIL_PASSWORD')?.replace(/\s+/g, '');
    const port = Number(this.config.get<string>('MAIL_PORT', '587'));
    const secure = this.config.get<string>('MAIL_SECURE', 'false')?.trim().toLowerCase() === 'true';

    this.from = this.config.get<string>('MAIL_FROM')?.trim() || user || 'CampusFlow <no-reply@localhost>';
    this.transporter = host && user && password
      ? nodemailer.createTransport({ host, port, secure, auth: { user, pass: password } })
      : null;
  }

  isConfigured() {
    return this.transporter !== null;
  }

  async sendAdminPasswordOtp(email: string, otp: string, expiresInMinutes: number) {
    if (!this.transporter) {
      throw new InternalServerErrorException('Email service is not configured. Set MAIL_HOST, MAIL_USER and MAIL_PASSWORD in backend/.env.');
    }

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'CampusFlow administrator password reset code',
      text: `Your CampusFlow password reset code is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49">
          <div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff">
            <h1 style="margin:0 0 8px">CampusFlow</h1>
            <p style="margin:0;color:#c9f4e7">Administrator password recovery</p>
          </div>
          <div style="padding:28px 4px">
            <p>Use this one-time verification code to reset your administrator password:</p>
            <div style="margin:24px 0;padding:18px;text-align:center;border-radius:14px;background:#eef4fb;letter-spacing:8px;font-size:32px;font-weight:800">${otp}</div>
            <p>This code expires in <strong>${expiresInMinutes} minutes</strong> and can be used only once.</p>
            <p style="color:#64748b">If you did not request this reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
  }
}
