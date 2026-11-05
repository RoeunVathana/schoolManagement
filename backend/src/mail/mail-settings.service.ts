import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type MailRuntimeConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  source: 'database' | 'environment' | 'none';
};

export type MailSettingsInput = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
};

@Injectable()
export class MailSettingsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  environmentConfig(): MailRuntimeConfig {
    const host = this.clean(this.config.get<string>('MAIL_HOST')) || '';
    const user = this.clean(this.config.get<string>('MAIL_USER')) || '';
    const password = (this.clean(this.config.get<string>('MAIL_PASSWORD')) || '').replace(/\s+/g, '');
    const configuredPort = Number(this.clean(this.config.get<string>('MAIL_PORT', '587')) || 587);
    const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 587;
    const requestedSecure = (this.clean(this.config.get<string>('MAIL_SECURE', 'false')) || '').toLowerCase() === 'true';
    const secure = port === 465 ? true : port === 587 ? false : requestedSecure;
    const from = this.clean(this.config.get<string>('MAIL_FROM')) || user || 'CampusFlow <no-reply@localhost>';
    return { host, port, secure, user, password, from, source: host && user && password ? 'environment' : 'none' };
  }

  async resolve(): Promise<MailRuntimeConfig> {
    const environment = this.environmentConfig();
    // A deployment secret is the safer source in production: it is managed by
    // the host, survives database restores, and cannot accidentally be
    // replaced by an old value saved in the admin UI. Administrators can opt
    // back in to the database record with MAIL_SETTINGS_SOURCE=database.
    if (environment.source === 'environment' && this.preferEnvironment()) return environment;

    const stored = await this.prisma.mailSetting.findUnique({ where: { id: 'mail' } });
    if (!stored) return environment;

    let password: string;
    try {
      password = this.decrypt(stored.passwordCiphertext, stored.passwordIv, stored.passwordTag);
    } catch {
      throw new InternalServerErrorException('Saved mail settings cannot be decrypted. Set MAIL_SETTINGS_ENCRYPTION_KEY to the original value or remove the saved mail settings.');
    }

    return {
      host: stored.host,
      port: stored.port,
      secure: stored.port === 465 ? true : stored.port === 587 ? false : stored.secure,
      user: stored.user,
      password,
      from: stored.from,
      source: 'database',
    };
  }

  async publicSettings() {
    const current = await this.resolve();
    const provider = (this.clean(this.config.get<string>('MAIL_PROVIDER')) || 'auto').toLowerCase();
    const resendConfigured = Boolean(this.clean(this.config.get<string>('RESEND_API_KEY')))
      && provider !== 'smtp';
    return {
      configured: Boolean(current.host && current.user && current.password) || resendConfigured,
      provider: resendConfigured ? 'resend' : 'smtp',
      source: current.source,
      host: current.host,
      port: current.port,
      secure: current.secure,
      user: this.maskEmail(current.user),
      from: this.maskFrom(current.from),
      passwordConfigured: Boolean(current.password),
    };
  }

  async saveSettings(input: MailSettingsInput) {
    const current = await this.resolve();
    const host = this.clean(input.host) || current.host || 'smtp.gmail.com';
    const user = this.clean(input.user) || current.user;
    const password = (this.clean(input.password) || current.password).replace(/\s+/g, '');
    const port = Number(input.port ?? current.port ?? 465);
    const secure = port === 465 ? true : port === 587 ? false : Boolean(input.secure ?? current.secure);
    const from = this.clean(input.from) || current.from || user;

    if (!user) throw new BadRequestException('MAIL_USER is required.');
    if (!password) throw new BadRequestException('MAIL_PASSWORD is required.');
    if (!host) throw new BadRequestException('MAIL_HOST is required.');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new BadRequestException('MAIL_PORT must be a valid port.');

    const encrypted = this.encrypt(password);
    await this.prisma.mailSetting.upsert({
      where: { id: 'mail' },
      update: { host, port, secure, user, from, ...encrypted },
      create: { id: 'mail', host, port, secure, user, from, ...encrypted },
    });
    return this.publicSettings();
  }

  async clearSettings() {
    await this.prisma.mailSetting.deleteMany({ where: { id: 'mail' } });
    return this.publicSettings();
  }

  private encryptionKey() {
    const secret = this.clean(this.config.get<string>('MAIL_SETTINGS_ENCRYPTION_KEY'))
      || this.clean(this.config.get<string>('PASSWORD_RESET_OTP_SECRET'))
      || this.clean(this.config.get<string>('JWT_ACCESS_SECRET'));
    if (!secret) throw new InternalServerErrorException('A server encryption secret is required for mail settings.');
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return {
      passwordCiphertext: ciphertext.toString('base64'),
      passwordIv: iv.toString('base64'),
      passwordTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decrypt(ciphertext: string, iv: string, tag: string) {
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  private clean(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1).trim();
    return trimmed;
  }

  private preferEnvironment() {
    const selected = (this.clean(this.config.get<string>('MAIL_SETTINGS_SOURCE')) || '').toLowerCase();
    if (['database', 'admin', 'settings'].includes(selected)) return false;
    if (['environment', 'env', 'railway'].includes(selected)) return true;
    // Default to deployment secrets in production, while local development
    // retains the editable database setting behaviour.
    return (this.clean(this.config.get<string>('NODE_ENV')) || '').toLowerCase() === 'production';
  }

  private maskEmail(value: string) {
    if (!value) return '';
    const [local, domain] = value.split('@');
    if (!domain) return `${value.slice(0, 2)}***`;
    return `${local.slice(0, 1)}***@${domain}`;
  }

  private maskFrom(value: string) {
    const match = value.match(/<([^>]+)>/);
    return match ? value.replace(match[1], this.maskEmail(match[1])) : this.maskEmail(value);
  }
}
