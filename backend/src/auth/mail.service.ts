import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailRuntimeConfig, MailSettingsService } from '../mail/mail-settings.service';

type MailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type ResendConfig = {
  apiKey: string;
  url: string;
};

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null;
  private fallbackTransporter: nodemailer.Transporter | null;
  private from = 'CampusFlow <no-reply@localhost>';
  private activeConfig: MailRuntimeConfig | null = null;
  private configSignature = '';
  private smtpStatus: 'not-configured' | 'checking' | 'ready' | 'failed' = 'not-configured';
  private smtpError: { code: string; responseCode: number | null; command: string | null } | null = null;

  constructor(private readonly config: ConfigService, private readonly mailSettings: MailSettingsService) {
    this.applyConfiguration(this.mailSettings.environmentConfig());
    void this.reload().catch((error) => console.error('[mail] Could not load saved mail settings', error?.message || error));
  }

  async reload() {
    const current = await this.mailSettings.resolve();
    const signature = [current.source, current.host, current.port, current.secure, current.user, current.password, current.from].join('|');
    if (signature !== this.configSignature) this.applyConfiguration(current);
    return current;
  }

  private applyConfiguration(current: MailRuntimeConfig) {
    this.activeConfig = current;
    this.from = current.from || current.user || 'CampusFlow <no-reply@localhost>';
    const { transporter, fallbackTransporter } = this.createTransporters(current);
    this.transporter = transporter;
    this.fallbackTransporter = fallbackTransporter;
    this.configSignature = [current.source, current.host, current.port, current.secure, current.user, current.password, current.from].join('|');
    this.smtpStatus = this.deliveryMode() === 'resend' ? 'ready' : this.transporter ? 'checking' : 'not-configured';
    this.smtpError = null;
    if (this.transporter && this.deliveryMode() !== 'resend') void this.verifyConnection(current.host, current.port, current.secure);
  }

  private createTransporters(current: MailRuntimeConfig) {
    const { host, user, password, port, secure } = current;
    const createTransporter = (transportPort: number, transportSecure: boolean) => nodemailer.createTransport({
      host,
      port: transportPort,
      secure: transportSecure,
      requireTLS: !transportSecure,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      // Some hosted runtimes advertise an unreachable IPv6 route for Gmail.
      // Prefer IPv4 so SMTP does not wait for the IPv6 connection to time out.
      family: 4,
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: { user, pass: password },
    } as any);

    const transporter = host && user && password ? createTransporter(port, secure) : null;
    const fallbackTransporter = transporter && host.toLowerCase() === 'smtp.gmail.com' && port === 587
      ? createTransporter(465, true)
      : null;
    return { transporter, fallbackTransporter };
  }

  private async verifyConnection(host: string, port: number, secure: boolean) {
    try {
      await this.transporter?.verify();
      this.smtpStatus = 'ready';
      this.smtpError = null;
      console.log(`[mail] SMTP connection verified (${host}:${port}, secure=${secure})`);
    } catch (error: any) {
      this.logTransportError('SMTP verification failed', error);
      const fallback = this.fallbackTransporter;
      if (!fallback || !this.canUseFallback(error)) {
        this.smtpStatus = 'failed';
        return;
      }

      try {
        await fallback.verify();
        this.transporter = fallback;
        this.smtpStatus = 'ready';
        this.smtpError = null;
        console.log('[mail] SMTP fallback connection verified (smtp.gmail.com:465, secure=true)');
      } catch (fallbackError: any) {
        this.smtpStatus = 'failed';
        this.logTransportError('SMTP fallback verification failed', fallbackError);
      }
    }
  }

  isConfigured() {
    return this.deliveryMode() !== 'none';
  }

  async configuration() {
    const settings = await this.mailSettings.publicSettings();
    await this.reload();
    return { ...settings, status: this.smtpStatus, error: this.smtpError };
  }

  async verifyCurrentConfiguration() {
    const current = await this.reload();
    if (this.deliveryMode() === 'resend') {
      try {
        await this.verifyResendConnection();
      } catch (error) {
        this.logTransportError('HTTPS mail provider verification failed', error);
        throw new BadRequestException('HTTPS mail provider verification failed. Check RESEND_API_KEY and the verified sender domain.');
      }
      return { verified: true, provider: 'resend' };
    }
    if (!this.transporter || !current.host || !current.user || !current.password) {
      throw new BadRequestException('Mail is not configured. Save MAIL_USER and MAIL_PASSWORD first.');
    }
    await this.verifyConnection(current.host, current.port, current.secure);
    if (this.smtpStatus !== 'ready') {
      const code = this.smtpError?.code;
      if (code === 'EAUTH' || this.smtpError?.responseCode === 535) throw new BadRequestException('SMTP authentication failed. Check the saved email address and App Password.');
      if (this.isConnectionFailure(this.smtpError)) throw new BadRequestException('The server could not connect to the SMTP host. Check outbound SMTP access on your hosting provider and the host/port settings.');
      throw new BadRequestException('SMTP verification failed. Check the mail server settings and server logs.');
    }
    return { verified: true, host: current.host, port: current.port, secure: current.secure };
  }

  async sendPasswordOtp(email: string, otp: string, expiresInMinutes: number, recipientName?: string) {
    const current = await this.reload();
    const deliveryMode = this.deliveryMode();
    if (deliveryMode === 'none') {
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
    }

    const safeName = recipientName?.trim() ? this.escapeHtml(recipientName.trim()) : 'there';
    const message = {
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
    };

    if (deliveryMode === 'resend') {
      try {
        await this.sendViaResend(message);
        this.smtpStatus = 'ready';
        this.smtpError = null;
        return;
      } catch (error) {
        this.logTransportError('Password OTP HTTPS email failed', error);
        this.smtpStatus = 'failed';
        throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Check the HTTPS mail provider configuration.');
      }
    }

    const transporter = this.transporter;
    if (!transporter) {
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
    }

    try {
      await transporter.sendMail(message);
      this.smtpStatus = 'ready';
      this.smtpError = null;
      return;
    } catch (error) {
      this.logTransportError('Password OTP email failed', error);
      this.smtpStatus = 'failed';
      if (!this.canUseFallback(error)) {
        throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
      }

      try {
        const fallback = this.fallbackTransporter;
        if (!fallback) throw new Error('SMTP fallback is unavailable');
        await fallback.sendMail(message);
        this.transporter = fallback;
        this.smtpStatus = 'ready';
        this.smtpError = null;
        console.log('[mail] Password OTP delivered through Gmail fallback (smtp.gmail.com:465, secure=true)');
        return;
      } catch (fallbackError) {
        this.smtpStatus = 'failed';
        this.logTransportError('Password OTP fallback email failed', fallbackError);
      }
    }

    // A saved admin SMTP record intentionally takes priority over MAIL_* values,
    // but an old saved record must not permanently break password recovery after
    // Railway has been configured with a verified environment account. Retry the
    // environment configuration without deleting the admin record.
    if (current.source === 'database') {
      const environment = this.mailSettings.environmentConfig();
      const environmentTransporters = this.createTransporters(environment);
      if (environmentTransporters.transporter) {
        console.warn('[mail] Saved SMTP configuration failed; retrying server environment configuration');
        try {
          await environmentTransporters.transporter.sendMail(message);
          this.applyConfiguration(environment);
          this.smtpStatus = 'ready';
          console.log('[mail] Password OTP delivered through server environment configuration');
          return;
        } catch (environmentError: any) {
          this.logTransportError('Password OTP environment email failed', environmentError);
          const fallback = environmentTransporters.fallbackTransporter;
          if (fallback && this.canUseFallback(environmentError, fallback, environmentTransporters.transporter)) {
            try {
              await fallback.sendMail(message);
              this.applyConfiguration(environment);
              this.transporter = fallback;
              this.smtpStatus = 'ready';
              this.smtpError = null;
              console.log('[mail] Password OTP delivered through environment Gmail fallback');
              return;
            } catch (fallbackError: any) {
              this.logTransportError('Password OTP environment fallback email failed', fallbackError);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException('Email delivery is temporarily unavailable. Please try again later.');
  }

  async sendAdminPasswordOtp(email: string, otp: string, expiresInMinutes: number) {
    return this.sendPasswordOtp(email, otp, expiresInMinutes);
  }

  async sendCoursePaymentConfirmation(email: string, recipientName: string, details: { invoiceNumber: string; courseName?: string; amount: string; currency: string; paymentPlan?: string; billingPeriod?: string | null; paidAt?: Date | string | null }) {
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

    return this.sendEmail({
      from: this.from,
      to: email,
      subject: 'CampusFlow course payment confirmed',
      text: `Hello ${recipientName || 'Student'},\n\nYour payment was successful.\nCourse: ${details.courseName || 'Course'}\nAmount: ${details.amount} ${details.currency}\nInvoice: ${details.invoiceNumber}\nPayment plan: ${details.paymentPlan || 'FULL'}${details.billingPeriod ? `\nBilling period: ${details.billingPeriod}` : ''}\nPaid at: ${paidAt}\n\nYour course is now unlocked in CampusFlow.${learningUrl ? ` Open it here: ${learningUrl}` : ''}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49"><div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff"><h1 style="margin:0 0 8px">CampusFlow</h1><p style="margin:0;color:#c9f4e7">Payment confirmed</p></div><div style="padding:28px 4px"><p>Hello ${safeName},</p><p>Your course payment was successful and your enrollment is now active.</p><div style="margin:20px 0;padding:18px;border-radius:14px;background:#eef4fb;line-height:1.8"><strong>Course:</strong> ${safeCourse}<br><strong>Amount:</strong> ${safeAmount} ${safeCurrency}<br><strong>Invoice:</strong> ${safeInvoice}<br><strong>Plan:</strong> ${safePlan}${safeBillingPeriod ? `<br><strong>Billing period:</strong> ${safeBillingPeriod}` : ''}<br><strong>Paid at:</strong> ${safePaidAt}</div>${learningUrl ? `<p><a href="${this.escapeHtml(learningUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#102846;color:#fff;text-decoration:none;font-weight:700">Open my courses</a></p>` : ''}<p style="color:#64748b">Keep this email as your payment confirmation. If you did not make this payment, contact your administrator immediately.</p></div></div>`,
    });
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
    return this.sendEmail({
      from: this.from,
      to: email,
      subject,
      text,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#142b49"><div style="padding:24px;border-radius:20px;background:linear-gradient(135deg,#102846,#236878);color:#fff"><h1 style="margin:0 0 8px">CampusFlow</h1><p style="margin:0;color:#c9f4e7">Learning community notification</p></div><div style="padding:28px 4px"><p>Hello ${this.escapeHtml(receiverName)},</p>${body}<p style="color:#64748b">You can manage your community notifications from your CampusFlow account.</p></div></div>`,
    });
  }

  private async sendEmail(message: MailMessage) {
    await this.reload();
    if (this.deliveryMode() === 'resend') {
      await this.sendViaResend(message);
      return true;
    }
    const transporter = this.transporter;
    if (!transporter) return false;
    await transporter.sendMail(message);
    return true;
  }

  private deliveryMode(): 'smtp' | 'resend' | 'none' {
    const provider = (this.cleanConfigValue(this.config.get<string>('MAIL_PROVIDER')) || 'auto').toLowerCase();
    const resend = this.resendConfig();
    if (provider === 'resend') return resend ? 'resend' : 'none';
    if (provider === 'smtp') return this.transporter ? 'smtp' : 'none';
    if (resend) return 'resend';
    return this.transporter ? 'smtp' : 'none';
  }

  private resendConfig(): ResendConfig | null {
    const apiKey = this.cleanConfigValue(this.config.get<string>('RESEND_API_KEY'));
    if (!apiKey) return null;
    return {
      apiKey,
      url: this.cleanConfigValue(this.config.get<string>('RESEND_API_URL')) || 'https://api.resend.com/emails',
    };
  }

  private async verifyResendConnection() {
    const resend = this.resendConfig();
    if (!resend) throw new Error('RESEND_API_KEY is not configured');
    const domainsUrl = new URL(resend.url);
    domainsUrl.pathname = domainsUrl.pathname.replace(/\/emails\/?$/, '/domains') || '/domains';
    const response = await fetch(domainsUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${resend.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw Object.assign(new Error(`HTTPS mail provider returned ${response.status}`), { code: `HTTP_${response.status}` });
  }

  private async sendViaResend(message: MailMessage) {
    const resend = this.resendConfig();
    if (!resend) throw new Error('RESEND_API_KEY is not configured');
    const response = await fetch(resend.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw Object.assign(new Error(`HTTPS mail provider returned ${response.status}`), { code: `HTTP_${response.status}` });
  }

  private async getTransporter() {
    await this.reload();
    return this.transporter;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
  }

  private cleanConfigValue(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  private isConnectionFailure(error: any) {
    const code = String(error?.code || '').toUpperCase();
    const command = String(error?.command || '').toUpperCase();
    return command === 'CONN' || ['ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'EPROTO', 'ESOCKET', 'ETIMEDOUT', 'EAI_AGAIN', 'ETLS'].includes(code);
  }

  private canUseFallback(error: any, fallback = this.fallbackTransporter, primary = this.transporter) {
    if (!fallback || !primary || primary === fallback) return false;
    const code = String(error?.code || '').toUpperCase();
    const command = String(error?.command || '').toUpperCase();
    // Authentication failures can also be caused by a provider-specific
    // STARTTLS negotiation. Trying implicit TLS once is safe; if credentials
    // are actually wrong, the fallback fails and the caller still receives a
    // generic delivery error without exposing SMTP details.
    return this.isConnectionFailure(error) || command === 'AUTH' || code === 'EAUTH';
  }

  private logTransportError(label: string, error: any) {
    this.smtpError = {
      code: error?.code || 'UNKNOWN',
      responseCode: error?.responseCode || null,
      command: error?.command || null,
    };
    console.error(`[mail] ${label}`, {
      ...this.smtpError,
      message: error?.message || 'No SMTP error message was provided',
    });
  }
}
