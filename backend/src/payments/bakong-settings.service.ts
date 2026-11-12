import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export type BakongRuntimeConfig = {
  registrationPaymentRequired: boolean;
  registrationFee: string;
  registrationCurrency: string;
  paymentQrExpiresMinutes: number;
  apiUrl: string;
  apiToken: string;
  apiEnabled: boolean;
  accountId: string;
  bakongMerchantName: string;
  bakongMerchantNameKm: string;
  bakongMerchantCity: string;
  bakongMerchantCityKm: string;
  merchantName: string;
  merchantCity: string;
  merchantPhone: string;
  storeLabel: string;
  source: 'database' | 'environment' | 'none';
};

export type BakongSettingsInput = Partial<Omit<BakongRuntimeConfig, 'apiToken' | 'source'>> & {
  apiToken?: string;
};

@Injectable()
export class BakongSettingsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  environmentConfig(): BakongRuntimeConfig {
    const apiEnabled = this.readBoolean('BAKONG_API_ENABLED', true);
    const registrationPaymentRequired = this.readBoolean('REGISTRATION_PAYMENT_REQUIRED', false);
    const paymentQrExpiresMinutes = this.normalizeExpiry(this.config.get<string>('PAYMENT_QR_EXPIRES_MINUTES', '10'));
    const apiUrl = this.clean(this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh')) || 'https://api-bakong.nbc.gov.kh';
    const apiToken = this.clean(this.config.get<string>('BAKONG_API_TOKEN')) || this.clean(this.config.get<string>('BAKONG_ACCESS_TOKEN')) || '';
    const bakongMerchantName = this.clean(this.config.get<string>('BAKONG_MERCHANT_NAME')) || '';
    const merchantName = this.clean(this.config.get<string>('MERCHANT_NAME')) || bakongMerchantName || 'CampusFlow';
    const bakongMerchantCity = this.clean(this.config.get<string>('BAKONG_MERCHANT_CITY')) || '';
    const bakongMerchantCityKm = this.clean(this.config.get<string>('BAKONG_MERCHANT_CITY_KM')) || 'ភ្នំពេញ';
    const merchantCity = this.clean(this.config.get<string>('MERCHANT_CITY')) || bakongMerchantCity || 'Phnom Penh';
    return {
      registrationPaymentRequired,
      registrationFee: this.clean(this.config.get<string>('REGISTRATION_FEE', '1.00')) || '1.00',
      registrationCurrency: this.normalizeCurrency(this.config.get<string>('REGISTRATION_CURRENCY', 'USD')),
      paymentQrExpiresMinutes,
      apiUrl,
      apiToken,
      apiEnabled,
      accountId: this.clean(this.config.get<string>('BAKONG_ACCOUNT_ID')) || '',
      bakongMerchantName,
      bakongMerchantNameKm: this.clean(this.config.get<string>('BAKONG_MERCHANT_NAME_KM')) || merchantName,
      bakongMerchantCity,
      bakongMerchantCityKm,
      merchantName,
      merchantCity,
      merchantPhone: this.clean(this.config.get<string>('MERCHANT_PHONE')) || '',
      storeLabel: this.clean(this.config.get<string>('STORE_LABEL')) || 'CampusFlow',
      source: apiToken || this.clean(this.config.get<string>('BAKONG_ACCOUNT_ID')) ? 'environment' : 'none',
    };
  }

  async resolve(): Promise<BakongRuntimeConfig> {
    const environment = this.environmentConfig();
    const stored = await this.prisma.bakongSetting.findUnique({ where: { id: 'bakong' } });
    if (!stored) return environment;

    const apiToken = stored.apiTokenCiphertext && stored.apiTokenIv && stored.apiTokenTag
      ? this.decrypt(stored.apiTokenCiphertext, stored.apiTokenIv, stored.apiTokenTag)
      : environment.apiToken;
    return {
      registrationPaymentRequired: stored.registrationPaymentRequired,
      registrationFee: stored.registrationFee || environment.registrationFee,
      registrationCurrency: this.normalizeCurrency(stored.registrationCurrency || environment.registrationCurrency),
      paymentQrExpiresMinutes: this.normalizeExpiry(stored.paymentQrExpiresMinutes || environment.paymentQrExpiresMinutes),
      apiUrl: stored.apiUrl || environment.apiUrl,
      apiToken,
      apiEnabled: stored.apiEnabled,
      accountId: stored.accountId || environment.accountId,
      bakongMerchantName: stored.bakongMerchantName || environment.bakongMerchantName,
      bakongMerchantNameKm: stored.bakongMerchantNameKm || environment.bakongMerchantNameKm,
      bakongMerchantCity: stored.bakongMerchantCity || environment.bakongMerchantCity,
      bakongMerchantCityKm: stored.bakongMerchantCityKm || environment.bakongMerchantCityKm,
      merchantName: stored.merchantName || environment.merchantName,
      merchantCity: stored.merchantCity || environment.merchantCity,
      merchantPhone: stored.merchantPhone || environment.merchantPhone,
      storeLabel: stored.storeLabel || environment.storeLabel,
      source: 'database',
    };
  }

  async publicSettings() {
    const current = await this.resolve();
    return {
      configured: Boolean(current.accountId),
      source: current.source,
      registrationPaymentRequired: current.registrationPaymentRequired,
      registrationFee: current.registrationFee,
      registrationCurrency: current.registrationCurrency,
      paymentQrExpiresMinutes: current.paymentQrExpiresMinutes,
      apiUrl: current.apiUrl,
      apiEnabled: current.apiEnabled,
      apiToken: this.maskToken(current.apiToken),
      apiTokenConfigured: Boolean(current.apiToken),
      accountId: current.accountId,
      bakongMerchantName: current.bakongMerchantName,
      bakongMerchantNameKm: current.bakongMerchantNameKm,
      bakongMerchantCity: current.bakongMerchantCity,
      bakongMerchantCityKm: current.bakongMerchantCityKm,
      merchantName: current.merchantName,
      merchantCity: current.merchantCity,
      merchantPhone: current.merchantPhone,
      storeLabel: current.storeLabel,
    };
  }

  async saveSettings(input: BakongSettingsInput) {
    const current = await this.resolve();
    const registrationFee = this.clean(input.registrationFee) || current.registrationFee;
    const registrationCurrency = this.normalizeCurrency(input.registrationCurrency || current.registrationCurrency);
    const paymentQrExpiresMinutes = this.normalizeExpiry(input.paymentQrExpiresMinutes ?? current.paymentQrExpiresMinutes);
    const apiUrl = this.clean(input.apiUrl) || current.apiUrl;
    const apiToken = this.clean(input.apiToken) || current.apiToken;
    const apiEnabled = input.apiEnabled ?? current.apiEnabled;
    const accountId = this.clean(input.accountId) || current.accountId;
    const bakongMerchantName = this.clean(input.bakongMerchantName) || current.bakongMerchantName;
    const bakongMerchantNameKm = this.clean(input.bakongMerchantNameKm) || current.bakongMerchantNameKm;
    const bakongMerchantCity = this.clean(input.bakongMerchantCity) || current.bakongMerchantCity;
    const bakongMerchantCityKm = this.clean(input.bakongMerchantCityKm) || current.bakongMerchantCityKm;
    const merchantName = this.clean(input.merchantName) || current.merchantName;
    const merchantCity = this.clean(input.merchantCity) || current.merchantCity;
    const merchantPhone = this.clean(input.merchantPhone) || current.merchantPhone;
    const storeLabel = this.clean(input.storeLabel) || current.storeLabel;

    const numericFee = Number(registrationFee);
    if (!Number.isFinite(numericFee) || numericFee <= 0 || numericFee > 1_000_000) throw new BadRequestException('REGISTRATION_FEE must be a positive amount.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(registrationFee)) throw new BadRequestException('REGISTRATION_FEE may contain at most two decimal places.');
    if (!/^https:\/\//i.test(apiUrl)) throw new BadRequestException('BAKONG_API_URL must use HTTPS.');
    if (!accountId) throw new BadRequestException('BAKONG_ACCOUNT_ID is required for KHQR generation.');
    if (!apiToken && apiEnabled) throw new BadRequestException('BAKONG_API_TOKEN is required when Bakong verification is enabled.');

    const encrypted = apiToken ? this.encrypt(apiToken) : { apiTokenCiphertext: '', apiTokenIv: '', apiTokenTag: '' };
    await this.prisma.bakongSetting.upsert({
      where: { id: 'bakong' },
      update: {
        registrationPaymentRequired: input.registrationPaymentRequired ?? current.registrationPaymentRequired,
        registrationFee,
        registrationCurrency,
        paymentQrExpiresMinutes,
        apiUrl,
        apiEnabled,
        accountId,
        bakongMerchantName,
        bakongMerchantNameKm,
        bakongMerchantCity,
        bakongMerchantCityKm,
        merchantName,
        merchantCity,
        merchantPhone,
        storeLabel,
        ...encrypted,
      },
      create: {
        id: 'bakong',
        registrationPaymentRequired: input.registrationPaymentRequired ?? current.registrationPaymentRequired,
        registrationFee,
        registrationCurrency,
        paymentQrExpiresMinutes,
        apiUrl,
        apiEnabled,
        accountId,
        bakongMerchantName,
        bakongMerchantNameKm,
        bakongMerchantCity,
        bakongMerchantCityKm,
        merchantName,
        merchantCity,
        merchantPhone,
        storeLabel,
        ...encrypted,
      },
    });
    return this.publicSettings();
  }

  async clearSettings() {
    await this.prisma.bakongSetting.deleteMany({ where: { id: 'bakong' } });
    return this.publicSettings();
  }

  private encryptionKey() {
    const secret = this.clean(this.config.get<string>('BAKONG_SETTINGS_ENCRYPTION_KEY'))
      || this.clean(this.config.get<string>('MAIL_SETTINGS_ENCRYPTION_KEY'))
      || this.clean(this.config.get<string>('PASSWORD_RESET_OTP_SECRET'))
      || this.clean(this.config.get<string>('JWT_ACCESS_SECRET'));
    if (!secret) throw new InternalServerErrorException('A server encryption secret is required for Bakong settings.');
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return {
      apiTokenCiphertext: ciphertext.toString('base64'),
      apiTokenIv: iv.toString('base64'),
      apiTokenTag: cipher.getAuthTag().toString('base64'),
    };
  }

  private decrypt(ciphertext: string, iv: string, tag: string) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      throw new InternalServerErrorException('Saved Bakong settings cannot be decrypted. Set BAKONG_SETTINGS_ENCRYPTION_KEY to the original value or remove the saved Bakong settings.');
    }
  }

  private clean(value?: string | number | boolean) {
    if (value === undefined || value === null) return undefined;
    const trimmed = String(value).trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1).trim();
    return trimmed;
  }

  private readBoolean(key: string, fallback: boolean) {
    const value = this.clean(this.config.get<string>(key));
    return value === undefined ? fallback : value.toLowerCase() === 'true';
  }

  private normalizeCurrency(value?: string) {
    const currency = String(value || 'USD').trim().toUpperCase();
    if (!['USD', 'KHR'].includes(currency)) throw new BadRequestException('Currency must be USD or KHR.');
    return currency;
  }

  private normalizeExpiry(value?: string | number) {
    const minutes = Number(value ?? 10);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10) throw new BadRequestException('PAYMENT_QR_EXPIRES_MINUTES must be an integer between 1 and 10.');
    return minutes;
  }

  private maskToken(value: string) {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
  }
}
