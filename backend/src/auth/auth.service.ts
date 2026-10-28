import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { Role, UserStatus } from '@prisma/client';
import { PaymentService } from '../payments/payment.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly payments: PaymentService) {}

  private safeUser(user: any) { const { password, ...safe } = user; return safe; }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async register(input: { fullName: string; email: string; password: string; phone?: string; role?: Role; specialization?: string; language?: string; profileImageUrl?: string }) {
    if (input.role === Role.ADMIN) throw new BadRequestException('Public registration is limited to students and teachers');
    const password = await bcrypt.hash(input.password, 12);
    const role = input.role === Role.TEACHER ? Role.TEACHER : Role.STUDENT;
    const paymentRequired = role === Role.STUDENT && this.payments.isRegistrationPaymentRequired();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { fullName: input.fullName, email: input.email, phone: input.phone, profileImageUrl: input.profileImageUrl, password, role, status: paymentRequired ? UserStatus.INACTIVE : UserStatus.ACTIVE, language: input.language === 'km' ? 'km' : 'en', canCreate: true, canEdit: true, canDelete: false } });
      if (role === Role.STUDENT) {
        await tx.student.create({ data: { userId: created.id, studentCode: `STU-${randomUUID().slice(0, 8).toUpperCase()}` } });
      } else {
        await tx.teacher.create({ data: { userId: created.id, teacherCode: `TCH-${randomUUID().slice(0, 8).toUpperCase()}`, specialization: input.specialization } });
      }
      return created;
    });
    if (!paymentRequired) return this.safeUser(user);
    try {
      const payment = await this.payments.createRegistrationPayment(user.id);
      return { user: this.safeUser(user), paymentRequired: true, payment };
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw error;
    }
  }

  async login(email: string, password: string, expectedRole?: Role) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE' || (expectedRole && user.role !== expectedRole) || !(await bcrypt.compare(password, user.password))) throw new UnauthorizedException('Invalid credentials for the selected account type');
    return this.issueTokens(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { student: true, teacher: true } });
    return this.safeUser(user);
  }

  async updateProfile(userId: string, input: { fullName?: string; phone?: string; password?: string; gender?: string; dateOfBirth?: string; address?: string; guardianName?: string; guardianPhone?: string; specialization?: string; language?: string }) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { student: true, teacher: true } });
    const userData: any = {};
    if (input.fullName !== undefined) userData.fullName = input.fullName;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.language !== undefined) userData.language = input.language === 'km' ? 'km' : 'en';
    if (input.password) userData.password = await bcrypt.hash(input.password, 12);
    const profile = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) await tx.user.update({ where: { id: userId }, data: userData });
      if (current.role === Role.STUDENT && current.student) {
        await tx.student.update({ where: { userId }, data: { gender: input.gender, dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined, address: input.address, guardianName: input.guardianName, guardianPhone: input.guardianPhone } });
      }
      if (current.role === Role.TEACHER && current.teacher) {
        await tx.teacher.update({ where: { userId }, data: { specialization: input.specialization, address: input.address } });
      }
      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { student: true, teacher: true } });
    });
    return this.safeUser(profile);
  }

  async updateProfileImage(userId: string, profileImageUrl: string) {
    const profile = await this.prisma.user.update({ where: { id: userId }, data: { profileImageUrl }, include: { student: true, teacher: true } });
    return this.safeUser(profile);
  }

  async issueTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') });
    const refreshToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt } });
    return { accessToken, refreshToken, user: this.safeUser(user) };
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
      const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hashToken(token) } });
      if (!stored || stored.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      return this.issueTokens(user);
    } catch { throw new UnauthorizedException('Invalid refresh token'); }
  }

  async logout(token?: string) {
    if (token) await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.hashToken(token) } });
    return { message: 'Logged out successfully' };
  }
}
