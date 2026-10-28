import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
    const amount = Number(this.config.get<string>('REGISTRATION_FEE', '1.00'));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('REGISTRATION_FEE must be a positive number.');
    const currencyName = this.normalizedCurrency(this.config.get<string>('REGISTRATION_CURRENCY', 'USD'));
    const invoiceNumber = `REG-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const expiresAt = this.paymentExpiry();
    const generated = this.generateKhqr({ amount, currencyName, invoiceNumber, expiresAt, purpose: 'Student registration', terminalLabel: 'Registration' });
    const payment = await this.prisma.registrationPayment.create({
      data: { userId, invoiceNumber, publicToken: randomUUID(), qrString: generated.qr, md5Hash: generated.md5, amount, currency: currencyName, expiresAt },
    });
    return this.toPublicPayment(payment);
  }

  async getRegistrationPayment(publicToken: string) {
    const payment = await this.expireRegistrationIfNeeded(publicToken);
    return this.toPublicPayment(payment);
  }

  async checkRegistrationPayment(publicToken: string) {
    const payment = await this.expireRegistrationIfNeeded(publicToken);
    if (payment.status !== PaymentStatus.PENDING) return this.toPublicPayment(payment);
    const result = await this.checkBakong(payment.md5Hash);
    if (!result.enabled) return this.toPublicPayment(payment, { verification: 'not_configured', message: 'Bakong verification is not configured yet.' });
    if (result.rateLimited) return this.toPublicPayment(payment, { verification: 'rate_limited', message: result.message });
    if (result.unavailable) return this.toPublicPayment(payment, { verification: 'unavailable', message: result.message || 'Payment verification is temporarily unavailable.' });
    if (result.data) return this.confirmRegistrationPayment(payment, result.data);
    const message = result.message || 'Payment is still pending.';
    if (/failed/i.test(message)) {
      const failed = await this.prisma.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      return this.toPublicPayment(failed, { message });
    }
    return this.toPublicPayment(payment, { message });
  }

  async createCoursePayment(courseId: string, userId: string, refresh = false) {
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId }, select: { id: true } });
    const course = await this.prisma.course.findFirst({ where: { id: courseId, status: 'ACTIVE' } });
    if (!course) throw new NotFoundException('This course is not available for purchase.');
    const currentEnrollment = await this.prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: student.id } } });
    if (currentEnrollment?.status === 'ACTIVE') throw new ConflictException('You have already purchased this course.');

    const pendingPayment = await this.prisma.coursePayment.findFirst({ where: { courseId, studentId: student.id, status: PaymentStatus.PENDING }, include: { course: true, student: { select: { userId: true } } }, orderBy: { createdAt: 'desc' } });
    // Older payments can contain a malformed QR generated before the optional
    // KHQR fields were kept within the EMV two-digit length limit. Never reuse
    // one of those codes: create a fresh payment instead.
    if (!refresh && pendingPayment && pendingPayment.expiresAt > new Date() && this.isValidKhqr(pendingPayment.qrString)) return this.toPublicCoursePayment(pendingPayment);
    if (pendingPayment) await this.prisma.coursePayment.update({ where: { id: pendingPayment.id }, data: { status: PaymentStatus.EXPIRED } });

    const amount = Number(course.price);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('This course has an invalid price.');
    const currencyName = this.normalizedCurrency(course.currency);
    // KHQR additional-data bill numbers may be at most 25 characters.
    const compactCourseCode = course.courseCode.replace(/[^A-Za-z0-9]/g, '').slice(-6);
    const invoiceNumber = `CP-${compactCourseCode}-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const expiresAt = this.paymentExpiry();
    const generated = this.generateKhqr({ amount, currencyName, invoiceNumber, expiresAt, purpose: `Course ${course.courseName}`, terminalLabel: 'Course purchase' });
    const payment = await this.prisma.coursePayment.create({
      data: { courseId, studentId: student.id, invoiceNumber, publicToken: randomUUID(), qrString: generated.qr, md5Hash: generated.md5, amount, currency: currencyName, expiresAt },
      include: { course: true, student: { select: { userId: true } } },
    });
    return this.toPublicCoursePayment(payment);
  }

  async getCoursePayment(publicToken: string, userId: string) {
    const payment = await this.expireCourseIfNeeded(publicToken, userId);
    return this.toPublicCoursePayment(payment);
  }

  async checkCoursePayment(publicToken: string, userId: string) {
    const payment = await this.expireCourseIfNeeded(publicToken, userId);
    if (payment.status !== PaymentStatus.PENDING) return this.toPublicCoursePayment(payment);
    const result = await this.checkBakong(payment.md5Hash);
    if (!result.enabled) return this.toPublicCoursePayment(payment, { verification: 'not_configured', message: 'Bakong verification is not configured yet.' });
    if (result.rateLimited) return this.toPublicCoursePayment(payment, { verification: 'rate_limited', message: result.message });
    if (result.unavailable) return this.toPublicCoursePayment(payment, { verification: 'unavailable', message: result.message || 'Payment verification is temporarily unavailable.' });
    if (result.data) return this.confirmCoursePayment(payment, result.data);
    const message = result.message || 'Payment is still pending.';
    if (/failed/i.test(message)) {
      const failed = await this.prisma.coursePayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED }, include: { course: true, student: { select: { userId: true } } } });
      return this.toPublicCoursePayment(failed, { message });
    }
    return this.toPublicCoursePayment(payment, { message });
  }

  private generateKhqr(input: { amount: number; currencyName: string; invoiceNumber: string; expiresAt: Date; purpose: string; terminalLabel: string }) {
    const accountId = this.config.get<string>('BAKONG_ACCOUNT_ID');
    if (!accountId) throw new ServiceUnavailableException('KHQR payment is not configured. Set BAKONG_ACCOUNT_ID in backend/.env.');
    const currency = input.currencyName === 'KHR' ? khqrData.currency.khr : input.currencyName === 'USD' ? khqrData.currency.usd : null;
    if (!currency) throw new BadRequestException('Course currency must be USD or KHR.');
    const merchantName = (this.config.get<string>('MERCHANT_NAME') || this.config.get<string>('BAKONG_MERCHANT_NAME') || 'CampusFlow').slice(0, 25);
    const merchantCity = (this.config.get<string>('MERCHANT_CITY') || this.config.get<string>('BAKONG_MERCHANT_CITY') || 'Phnom Penh').slice(0, 15);
    const storeLabel = (this.config.get<string>('STORE_LABEL') || 'CampusFlow').slice(0, 25);
    const mobileNumber = this.config.get<string>('MERCHANT_PHONE') || undefined;
    const alternateName = this.config.get<string>('BAKONG_MERCHANT_NAME_KM', merchantName).slice(0, 25);
    const info = new IndividualInfo(accountId, merchantName, merchantCity, {
      currency,
      amount: input.amount,
      billNumber: input.invoiceNumber,
      mobileNumber,
      storeLabel,
      terminalLabel: input.terminalLabel.slice(0, 25),
      // The SDK encodes the complete additional-data value with a two-digit
      // length. Adding the course purpose can push that value over 99 chars
      // and produce a QR that scans as invalid. The invoice already identifies
      // the payment, so leave this optional field out.
      expirationTimestamp: input.expiresAt.getTime(),
      languagePreference: 'km',
      merchantNameAlternateLanguage: alternateName,
      merchantCityAlternateLanguage: 'ភ្នំពេញ',
    });
    const generated = new BakongKHQR().generateIndividual(info);
    if (generated?.status?.code !== 0 || !generated?.data?.qr || !generated?.data?.md5) throw new BadRequestException(generated?.status?.message || 'Unable to generate KHQR payment code.');
    if (!this.isValidKhqr(generated.data.qr)) throw new BadRequestException('The generated KHQR is invalid. Please check the Bakong account configuration.');
    return { qr: generated.data.qr, md5: generated.data.md5 };
  }

  private isValidKhqr(qrString: string) {
    try {
      return Boolean(qrString && BakongKHQR.verify(qrString)?.isValid);
    } catch {
      return false;
    }
  }

  private async checkBakong(md5: string): Promise<{ enabled: boolean; unavailable?: boolean; rateLimited?: boolean; data?: any; message?: string }> {
    const enabled = this.config.get<string>('BAKONG_API_ENABLED', 'true') === 'true';
    const accessToken = this.config.get<string>('BAKONG_API_TOKEN') || this.config.get<string>('BAKONG_ACCESS_TOKEN');
    if (!enabled || !accessToken) return { enabled: false };
    const apiUrl = (this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh') || '').replace(/\/$/, '');
    try {
      const response = await fetch(`${apiUrl}/v1/check_transaction_by_md5`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ md5 }) });
      const result: any = await response.json();
      const message = String(result.responseMessage || '');
      if (response.status === 429 || result.errorCode === 17 || /daily request limit|request limit.*exceeded/i.test(message)) {
        return { enabled: true, rateLimited: true, message: 'Bakong verification has reached its daily request limit. Please try again tomorrow or configure a fresh Bakong API token.' };
      }
      if (result.responseCode === 0 && result.data) return { enabled: true, data: result.data };
      return { enabled: true, message: message || 'Payment is still pending.' };
    } catch (error) {
      this.logger.warn(`Bakong payment check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { enabled: true, unavailable: true };
    }
  }

  private async confirmRegistrationPayment(payment: any, transaction: any) {
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

  private async confirmCoursePayment(payment: any, transaction: any) {
    const configuredAccount = this.config.get<string>('BAKONG_ACCOUNT_ID');
    const amountMatches = Math.abs(Number(transaction.amount) - Number(payment.amount)) < 0.0001;
    const currencyMatches = String(transaction.currency || '').toUpperCase() === payment.currency;
    const accountMatches = !configuredAccount || String(transaction.toAccountId || '').toLowerCase() === configuredAccount.toLowerCase();
    if (!amountMatches || !currencyMatches || !accountMatches) {
      const failed = await this.prisma.coursePayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED }, include: { course: true, student: { select: { userId: true } } } });
      return this.toPublicCoursePayment(failed, { message: 'Payment details did not match this course invoice.' });
    }
    const paid = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.coursePayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.PAID, paidAt: new Date(), transactionHash: transaction.hash, fromAccountId: transaction.fromAccountId, toAccountId: transaction.toAccountId }, include: { course: true, student: { select: { userId: true } } } });
      await tx.enrollment.upsert({ where: { courseId_studentId: { courseId: updated.courseId, studentId: updated.studentId } }, update: { status: 'ACTIVE', enrollmentDate: new Date() }, create: { courseId: updated.courseId, studentId: updated.studentId, status: 'ACTIVE' } });
      return updated;
    });
    return this.toPublicCoursePayment(paid, { message: 'Payment confirmed. The course is now unlocked.', enrolled: true });
  }

  private paymentExpiry() {
    const expirationMinutes = Math.min(Math.max(Number(this.config.get<string>('PAYMENT_QR_EXPIRES_MINUTES', '10')), 1), 10);
    return new Date(Date.now() + expirationMinutes * 60 * 1000);
  }

  private normalizedCurrency(value: string | undefined) {
    const currency = String(value || 'USD').toUpperCase();
    if (!['USD', 'KHR'].includes(currency)) throw new BadRequestException('Currency must be USD or KHR.');
    return currency;
  }

  private async expireRegistrationIfNeeded(publicToken: string) {
    const payment = await this.prisma.registrationPayment.findUnique({ where: { publicToken } });
    if (!payment) throw new NotFoundException('Registration payment was not found.');
    if (payment.status === PaymentStatus.PENDING && payment.expiresAt <= new Date()) return this.prisma.registrationPayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.EXPIRED } });
    return payment;
  }

  private async expireCourseIfNeeded(publicToken: string, userId: string) {
    const payment = await this.prisma.coursePayment.findUnique({ where: { publicToken }, include: { course: true, student: { select: { userId: true } } } });
    if (!payment) throw new NotFoundException('Course payment was not found.');
    if (payment.student.userId !== userId) throw new ForbiddenException('You can only view your own course payment.');
    if (payment.status === PaymentStatus.PENDING && payment.expiresAt <= new Date()) return this.prisma.coursePayment.update({ where: { id: payment.id }, data: { status: PaymentStatus.EXPIRED }, include: { course: true, student: { select: { userId: true } } } });
    return payment;
  }

  private toPublicPayment(payment: any, extra: Record<string, unknown> = {}) {
    return { id: payment.id, publicToken: payment.publicToken, invoiceNumber: payment.invoiceNumber, qrString: payment.qrString, md5Hash: payment.md5Hash, amount: payment.amount.toString(), currency: payment.currency, status: payment.status, expiresAt: payment.expiresAt, paidAt: payment.paidAt, provider: 'KHQR', ...extra };
  }

  private toPublicCoursePayment(payment: any, extra: Record<string, unknown> = {}) {
    return { ...this.toPublicPayment(payment, extra), courseId: payment.courseId, courseName: payment.course?.courseName, courseCode: payment.course?.courseCode };
  }
}
