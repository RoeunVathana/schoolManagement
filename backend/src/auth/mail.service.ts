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

  async sendPasswordOtp(email: string, otp: string, expiresInMinutes: number, recipientName?: string) {
    if (!this.transporter) {
      throw new InternalServerErrorException('Email service is not configured. Set MAIL_HOST, MAIL_USER and MAIL_PASSWORD in backend/.env.');
    }

    const safeName = recipientName?.trim() ? this.escapeHtml(recipientName.trim()) : 'there';
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'CampusFlow password reset code',
      text: `Your CampusFlow password reset code is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, ignore this email.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49">
          <div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff">
            <h1 style="margin:0 0 8px">CampusFlow</h1>
            <p style="margin:0;color:#c9f4e7">Password recovery</p>
          </div>
          <div style="padding:28px 4px">
            <p>Hello ${safeName},</p>
            <p>Use this one-time verification code to reset your CampusFlow password:</p>
            <div style="margin:24px 0;padding:18px;text-align:center;border-radius:14px;background:#eef4fb;letter-spacing:8px;font-size:32px;font-weight:800">${otp}</div>
            <p>This code expires in <strong>${expiresInMinutes} minutes</strong> and can be used only once.</p>
            <p style="color:#64748b">If you did not request this reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
  }

  async sendAdminPasswordOtp(email: string, otp: string, expiresInMinutes: number) {
    return this.sendPasswordOtp(email, otp, expiresInMinutes);
  }

  async sendCoursePaymentConfirmation(email: string, recipientName: string, details: { invoiceNumber: string; courseName?: string; amount: string; currency: string; paymentPlan?: string; billingPeriod?: string | null; paidAt?: Date | string | null }) {
    if (!this.transporter) return false;

    const safeName = this.escapeHtml(recipientName || 'Student');
    const safeInvoice = this.escapeHtml(details.invoiceNumber);
    const safeCourse = this.escapeHtml(details.courseName || 'Course');
    const safeAmount = this.escapeHtml(details.amount);
    const safeCurrency = this.escapeHtml(details.currency);
    const safePlan = this.escapeHtml(details.paymentPlan || 'FULL');
    const safeBillingPeriod = details.billingPeriod ? this.escapeHtml(details.billingPeriod) : '';
    const paidAt = details.paidAt ? new Date(details.paidAt).toISOString() : new Date().toISOString();
    const safePaidAt = this.escapeHtml(paidAt);
    const appUrl = (this.config.get<string>('PUBLIC_APP_URL') || this.config.get<string>('FRONTEND_URL') || '').trim().replace(/\/+$/, '');
    const learningUrl = appUrl ? `${appUrl}/student/courses` : '';

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'CampusFlow course payment confirmed',
      text: `Hello ${recipientName || 'Student'},\n\nYour payment was successful.\nCourse: ${details.courseName || 'Course'}\nAmount: ${details.amount} ${details.currency}\nInvoice: ${details.invoiceNumber}\nPayment plan: ${details.paymentPlan || 'FULL'}${details.billingPeriod ? `\nBilling period: ${details.billingPeriod}` : ''}\nPaid at: ${paidAt}\n\nYour course is now unlocked in CampusFlow.${learningUrl ? ` Open it here: ${learningUrl}` : ''}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49"><div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff"><h1 style="margin:0 0 8px">CampusFlow</h1><p style="margin:0;color:#c9f4e7">Payment confirmed</p></div><div style="padding:28px 4px"><p>Hello ${safeName},</p><p>Your course payment was successful and your enrollment is now active.</p><div style="margin:20px 0;padding:18px;border-radius:14px;background:#eef4fb;line-height:1.8"><strong>Course:</strong> ${safeCourse}<br><strong>Amount:</strong> ${safeAmount} ${safeCurrency}<br><strong>Invoice:</strong> ${safeInvoice}<br><strong>Plan:</strong> ${safePlan}${safeBillingPeriod ? `<br><strong>Billing period:</strong> ${safeBillingPeriod}` : ''}<br><strong>Paid at:</strong> ${safePaidAt}</div>${learningUrl ? `<p><a href="${this.escapeHtml(learningUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#102846;color:#fff;text-decoration:none;font-weight:700">Open my courses</a></p>` : ''}<p style="color:#64748b">Keep this email as your payment confirmation. If you did not make this payment, contact your administrator immediately.</p></div></div>`,
    });
    return true;
  }

  async sendFriendRequestNotification(email: string, receiverName: string, senderName: string) {
    return this.sendCommunityEmail(
      email,
      `CampusFlow: ${senderName} sent you a friend request`,
      `${senderName} sent you a friend request on CampusFlow. Open the community to review it.`,
      `<p><strong>${this.escapeHtml(senderName)}</strong> sent you a friend request on CampusFlow.</p><p>Open the community to review the request and connect.</p>`,
      receiverName,
    );
  }

  async sendFriendRequestAcceptedNotification(email: string, receiverName: string, accepterName: string) {
    return this.sendCommunityEmail(
      email,
      `CampusFlow: ${accepterName} accepted your friend request`,
      `${accepterName} accepted your friend request on CampusFlow. You can now message each other.`,
      `<p><strong>${this.escapeHtml(accepterName)}</strong> accepted your friend request on CampusFlow.</p><p>You can now message each other in the community.</p>`,
      receiverName,
    );
  }

  private async sendCommunityEmail(email: string, subject: string, text: string, body: string, receiverName: string) {
    if (!this.transporter) return false;
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject,
      text,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49"><div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff"><h1 style="margin:0 0 8px">CampusFlow</h1><p style="margin:0;color:#c9f4e7">Learning community notification</p></div><div style="padding:28px 4px"><p>Hello ${this.escapeHtml(receiverName)},</p>${body}<p style="color:#64748b">You can manage your community notifications from your CampusFlow account.</p></div></div>`,
    });
    return true;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
  }
}
