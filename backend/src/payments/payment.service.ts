import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// The official NBC JavaScript KHQR SDK is CommonJS and does not ship TypeScript declarations.
const { BakongKHQR, khqrData, IndividualInfo } = require('bakong-khqr');

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  isRegistrationPaymentRequired() {
    return this.config.get<string>('REGISTRATION_PAYMENT_REQUIRED', 'false') === 'true';
  }

  async createRegistrationPayment(userId: string) {
    const accountId = this.config.get<string>('BAKONG_ACCOUNT_ID');
    if (!accountId) throw new ServiceUnavailableException('KHQR payment is not configured. Set BAKONG_ACCOUNT_ID in backend/.env.');

    const amount = Number(this.config.get<string>('REGISTRATION_FEE', '1.00'));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('REGISTRATION_FEE must be a positive number.');

    const currencyName = this.config.get<string>('REGISTRATION_CURRENCY', 'USD').toUpperCase();
    const currency = currencyName === 'KHR' ? khqrData.currency.khr : currencyName === 'USD' ? khqrData.currency.usd : null;
    if (!currency) throw new BadRequestException('REGISTRATION_CURRENCY must be USD or KHR.');

    const expirationMinutes = Math.min(Math.max(Number(this.config.get<string>('PAYMENT_QR_EXPIRES_MINUTES', '10')), 1), 10);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    const invoiceNumber = `REG-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const merchantName = this.config.get<string>('BAKONG_MERCHANT_NAME', 'CampusFlow').slice(0, 25);
    const merchantCity = this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh').slice(0, 15);
    const alternateName = this.config.get<string>('BAKONG_MERCHANT_NAME_KM', 'CampusFlow').slice(0, 25);

    const info = new IndividualInfo(accountId, merchantName, merchantCity, {
      currency,
      amount,
      billNumber: invoiceNumber,
      storeLabel: 'CampusFlow',
      terminalLabel: 'Registration',
      purposeOfTransaction: 'Student registration',
      expirationTimestamp: expiresAt.getTime(),
      languagePreference: 'km',
      merchantNameAlternateLanguage: alternateName,
      merchantCityAlternateLanguage: 'ភ្នំពេញ',
    });
    const generated = new BakongKHQR().generateIndividual(info);
    if (generated?.status?.code !== 0 || !generated?.data?.qr || !generated?.data?.md5) {
      throw new BadRequestException(generated?.status?.message || 'Unable to generate KHQR payment code.');
    }

    const payment = await this.prisma.registrationPayment.create({
      data: {
        userId,
        invoiceNumber,
        publicToken: randomUUID(),
        qrString: generated.data.qr,
        md5Hash: generated.data.md5,
        amount,
        currency: currencyName,
        expiresAt,
      },
    });
    return this.toPublicPayment(payment);
  }

  async getRegistrationPayment(publicToken: string) {
    const payment = await this.expireIfNeeded(publicToken);
    return this.toPublicPayment(payment);
  }

  async checkRegistrationPayment(publicToken: string) {
    const payment = await this.expireIfNeeded(publicToken);
    if (payment.status !== PaymentStatus.PENDING) return this.toPublicPayment(payment);

    const accessToken = this.config.get<string>('BAKONG_ACCESS_TOKEN');
    if (!accessToken) return this.toPublicPayment(payment, { verification: 'not_configured', message: 'Bakong verification is not configured yet.' });

    const apiUrl = this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh').replace(/\/$/, '');
    try {
      const response = await fetch(`${apiUrl}/v1/check_transaction_by_md5`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ md5: payment.md5Hash }),
      });
      const result: any = await response.json();
      if (result.responseCode === 0 && result.data) return this.confirmPayment(payment, result.data);

      const message = result.responseMessage || 'Payment is still pending.';
      if (/failed/i.test(message)) {
        const failed = await this.prisma.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
        return this.toPublicPayment(failed, { message });
      }
      return this.toPublicPayment(payment, { message });
    } catch (error) {
      this.logger.warn(`Bakong payment check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.toPublicPayment(payment, { verification: 'unavailable', message: 'Payment verification is temporarily unavailable.' });
    }
  }

  private async confirmPayment(payment: any, transaction: any) {
    const configuredAccount = this.config.get<string>('BAKONG_ACCOUNT_ID');
    const amountMatches = Math.abs(Number(transaction.amount) - Number(payment.amount)) < 0.0001;
    const currencyMatches = String(transaction.currency || '').toUpperCase() === payment.currency;
    const accountMatches = !configuredAccount || String(transaction.toAccountId || '').toLowerCase() === configuredAccount.toLowerCase();
    if (!amountMatches || !currencyMatches || !accountMatches) {
      const failed = await this.prisma.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      return this.toPublicPayment(failed, { message: 'Payment details did not match this registration invoice.' });
    }

    const paid = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID, paidAt: new Date(), transactionHash: transaction.hash, fromAccountId: transaction.fromAccountId, toAccountId: transaction.toAccountId } });
      await tx.user.update({ where: { id: payment.userId }, data: { status: UserStatus.ACTIVE } });
      return updated;
    });
    return this.toPublicPayment(paid, { message: 'Payment confirmed. Your account is now active.' });
  }

  private async expireIfNeeded(publicToken: string) {
    const payment = await this.prisma.registrationPayment.findUnique({ where: { publicToken } });
    if (!payment) throw new NotFoundException('Registration payment was not found.');
    if (payment.status === PaymentStatus.PENDING && payment.expiresAt <= new Date()) return this.prisma.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.EXPIRED } });
    return payment;
  }

  private toPublicPayment(payment: any, extra: Record<string, unknown> = {}) {
    return { id: payment.id, publicToken: payment.publicToken, invoiceNumber: payment.invoiceNumber, qrString: payment.qrString, md5Hash: payment.md5Hash, amount: payment.amount.toString(), currency: payment.currency, status: payment.status, expiresAt: payment.expiresAt, paidAt: payment.paidAt, provider: 'KHQR', ...extra };
  }
}
