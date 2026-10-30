import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { Role, UserStatus } from '@prisma/client';
import { PaymentService } from '../payments/payment.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly payments: PaymentService, private readonly firebase: FirebaseAuthService, private readonly mail: MailService) {}

  private isOnline(lastSeenAt?: Date | string | null) { return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() <= 90_000; }
  private safeUser(user: any) { const { password, ...safe } = user; const withPresence = { ...safe, isOnline: this.isOnline(safe.lastSeenAt) }; return withPresence.role === Role.ADMIN ? { ...withPresence, canCreate: true, canEdit: true, canDelete: true } : withPresence; }
  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private hashOtp(otp: string, userId: string) { return createHash('sha256').update(`${userId}:${otp}:${this.config.get('JWT_ACCESS_SECRET', 'campusflow')}`).digest('hex'); }

  async register(input: { fullName?: string; username?: string; firstName?: string; lastName?: string; email: string; password: string; phone?: string; accountType?: Role; role?: Role; specialization?: string; language?: string; profileImageUrl?: string }) {
    const role = input.accountType ?? input.role ?? Role.STUDENT;
    if (role !== Role.STUDENT && role !== Role.CUSTOMER) {
      throw new BadRequestException('Public registration only allows STUDENT or CUSTOMER accounts');
    }

    const password = await bcrypt.hash(input.password, Number(this.config.get('BCRYPT_SALT_ROUNDS', '12')) || 12);
    const paymentRequired = role === Role.STUDENT && this.payments.isRegistrationPaymentRequired();
    const status = paymentRequired ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    const firstName = input.firstName?.trim() || undefined;
    const lastName = input.lastName?.trim() || undefined;
    const fullName = input.fullName?.trim() || [firstName, lastName].filter(Boolean).join(' ');
    if (!fullName) throw new BadRequestException('First name and last name are required');
    const username = input.username?.trim().toLowerCase() || `user_${randomUUID().slice(0, 8).toLowerCase()}`;

    let user: any;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: {
          fullName,
          firstName,
          lastName,
          email: input.email.trim().toLowerCase(),
          phone: input.phone,
          profileImageUrl: input.profileImageUrl,
          password,
          role,
          status,
          language: input.language === 'km' ? 'km' : 'en',
          canCreate: true,
          canEdit: true,
          canDelete: false,
          profile: { create: { username, email: input.email.trim().toLowerCase(), firstName, lastName, phone: input.phone, avatar: input.profileImageUrl, role, accountStatus: status } },
        } });
        if (role === Role.STUDENT) {
          await tx.student.create({ data: { userId: created.id, studentCode: `STU-${randomUUID().slice(0, 8).toUpperCase()}` } });
        }
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: { profile: true, student: true, teacher: true } });
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('Email or username is already registered');
      throw error;
    }
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
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail }, include: { profile: true, student: true, teacher: true } });
    if (!user || user.status !== 'ACTIVE' || (expectedRole && user.role !== expectedRole) || !(await bcrypt.compare(password, user.password))) throw new UnauthorizedException('Invalid credentials for the selected account type');
    return this.issueTokens(user);
  }

  async requestAdminPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    const genericMessage = 'If the administrator email exists, a verification code has been sent.';

    // Keep this response generic for unknown addresses so the endpoint cannot enumerate users.
    if (!user || user.role !== Role.ADMIN || user.status !== UserStatus.ACTIVE) return { message: genericMessage };

    const expiresInMinutes = Math.max(5, Number(this.config.get<string>('PASSWORD_RESET_OTP_EXPIRES_MINUTES', '10')) || 10);
    const latest = await this.prisma.passwordResetOtp.findFirst({ where: { userId: user.id, usedAt: null }, orderBy: { createdAt: 'desc' } });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) throw new BadRequestException('Please wait one minute before requesting another code.');

    const otp = String(randomInt(100000, 1000000));
    const reset = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetOtp.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      return tx.passwordResetOtp.create({ data: { userId: user.id, codeHash: this.hashOtp(otp, user.id), expiresAt: new Date(Date.now() + expiresInMinutes * 60_000) } });
    });

    try {
      await this.mail.sendAdminPasswordOtp(user.email, otp, expiresInMinutes);
    } catch (error) {
      await this.prisma.passwordResetOtp.delete({ where: { id: reset.id } }).catch(() => undefined);
      throw error;
    }

    return { message: genericMessage, expiresInMinutes };
  }

  async resetAdminPassword(email: string, otp: string, newPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.role !== Role.ADMIN || user.status !== UserStatus.ACTIVE) throw new BadRequestException('Invalid or expired verification code.');

    const reset = await this.prisma.passwordResetOtp.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!reset || reset.attempts >= 5) throw new BadRequestException('Invalid or expired verification code.');
    if (this.hashOtp(otp, user.id) !== reset.codeHash) {
      const attempts = reset.attempts + 1;
      await this.prisma.passwordResetOtp.update({ where: { id: reset.id }, data: { attempts, usedAt: attempts >= 5 ? new Date() : undefined } });
      throw new BadRequestException(attempts >= 5 ? 'Too many invalid attempts. Request a new code.' : 'Invalid or expired verification code.');
    }

    const password = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { password } }),
      this.prisma.passwordResetOtp.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return { message: 'Password reset successfully. You can now sign in as administrator.' };
  }

  async loginWithGoogle(idToken: string, expectedRole: Role) {
    if (expectedRole === Role.ADMIN) throw new UnauthorizedException('Google sign-in is not available for administrator accounts');

    let decoded: any;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Google sign-in token is invalid or expired');
    }

    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email || decoded.email_verified === false) throw new UnauthorizedException('Your Google account must have a verified email address');

    let user = await this.prisma.user.findFirst({ where: { OR: [{ firebaseUid: decoded.uid }, { email }] }, include: { student: true, teacher: true } });
    if (user && user.role !== expectedRole) throw new UnauthorizedException('This Google account belongs to a different account type');
    if (user && user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('This account is not active');

    if (!user) {
      const password = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName: decoded.name || email.split('@')[0],
            email,
            firebaseUid: decoded.uid,
            password,
            profileImageUrl: decoded.picture,
            role: expectedRole,
            status: UserStatus.ACTIVE,
            language: 'en',
            canCreate: true,
            canEdit: true,
            canDelete: false,
          },
        });
        if (expectedRole === Role.STUDENT) {
          await tx.student.create({ data: { userId: created.id, studentCode: `STU-${randomUUID().slice(0, 8).toUpperCase()}` } });
        } else {
          await tx.teacher.create({ data: { userId: created.id, teacherCode: `TCH-${randomUUID().slice(0, 8).toUpperCase()}` } });
        }
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: { student: true, teacher: true } });
      });
    } else if (!user.firebaseUid) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { firebaseUid: decoded.uid, profileImageUrl: user.profileImageUrl || decoded.picture }, include: { student: true, teacher: true } });
    }

    return this.issueTokens(user);
  }

  async getProfile(userId: string) {
    let user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, student: true, teacher: true } });
    if (!user.profile) {
      const username = `legacy_${user.id}`;
      await this.prisma.profile.create({ data: { userId: user.id, username, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, avatar: user.profileImageUrl, role: user.role, accountStatus: user.status } }).catch((error) => {
        if ((error as { code?: string })?.code !== 'P2002') throw error;
      });
      user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, student: true, teacher: true } });
    }
    return this.safeUser(user);
  }

  async updatePresence(userId: string, online = true) {
    const lastSeenAt = online ? new Date() : null;
    const user = await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt }, select: { lastSeenAt: true } });
    return { online, lastSeenAt: user.lastSeenAt };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) throw new UnauthorizedException('Current password is incorrect');
    if (currentPassword === newPassword) throw new BadRequestException('New password must be different from the current password');
    const password = await bcrypt.hash(newPassword, Number(this.config.get('BCRYPT_SALT_ROUNDS', '12')) || 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { password } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    return { message: 'Password changed successfully. Please sign in again.' };
  }

  async updateProfile(userId: string, input: { fullName?: string; phone?: string; password?: string; gender?: string; dateOfBirth?: string; address?: string; guardianName?: string; guardianPhone?: string; specialization?: string; bio?: string; location?: string; website?: string; school?: string; course?: string; yearLevel?: string; language?: string }) {
    let current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, student: true, teacher: true } });
    if (!current.profile) {
      await this.getProfile(userId);
      current = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, student: true, teacher: true } });
    }
    const userData: any = {};
    const profileData: any = {};
    if (input.fullName !== undefined) userData.fullName = input.fullName;
    if (input.phone !== undefined) userData.phone = input.phone;
    if (input.language !== undefined) userData.language = input.language === 'km' ? 'km' : 'en';
    if (input.password) userData.password = await bcrypt.hash(input.password, 12);
    for (const key of ['bio', 'location', 'website', 'school', 'course', 'yearLevel']) if (input[key as keyof typeof input] !== undefined) profileData[key] = input[key as keyof typeof input]?.trim() || null;
    const profile = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) await tx.user.update({ where: { id: userId }, data: userData });
      if (Object.keys(profileData).length && current.profile) await tx.profile.update({ where: { userId }, data: profileData });
      if (current.role === Role.STUDENT && current.student) {
        await tx.student.update({ where: { userId }, data: { gender: input.gender, dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined, address: input.address, guardianName: input.guardianName, guardianPhone: input.guardianPhone } });
      }
      if (current.role === Role.TEACHER && current.teacher) {
        await tx.teacher.update({ where: { userId }, data: { specialization: input.specialization, address: input.address } });
      }
      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, student: true, teacher: true } });
    });
    return this.safeUser(profile);
  }

  async updateProfileImage(userId: string, profileImageUrl: string) {
    await this.getProfile(userId);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { profileImageUrl } }),
      this.prisma.profile.update({ where: { userId }, data: { avatar: profileImageUrl } }),
    ]);
    return this.getProfile(userId);
  }

  async updateCoverImage(userId: string, coverImage: string) {
    await this.getProfile(userId);
    await this.prisma.profile.update({ where: { userId }, data: { coverImage } });
    return this.getProfile(userId);
  }

  async issueTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jwtContext = { issuer: this.config.get('JWT_ISSUER', 'campusflow-api'), audience: this.config.get('JWT_AUDIENCE', 'campusflow-web') };
    const accessToken = await this.jwt.signAsync(payload, { ...jwtContext, secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') });
    const refreshToken = await this.jwt.signAsync(payload, { ...jwtContext, secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: this.hashToken(refreshToken), expiresAt } });
    return { accessToken, refreshToken, user: this.safeUser(user) };
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), issuer: this.config.get('JWT_ISSUER', 'campusflow-api'), audience: this.config.get('JWT_AUDIENCE', 'campusflow-web') });
      const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hashToken(token) } });
      if (!stored || stored.userId !== payload.sub || stored.expiresAt <= new Date()) throw new UnauthorizedException('Refresh token expired');
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub }, include: { profile: true, student: true, teacher: true } });
      if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('This account is not active');
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      return this.issueTokens(user);
    } catch { throw new UnauthorizedException('Invalid refresh token'); }
  }

  async logout(token?: string) {
    if (token) await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.hashToken(token) } });
    return { message: 'Logged out successfully' };
  }
}
