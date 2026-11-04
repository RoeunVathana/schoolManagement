import { randomUUID } from 'crypto';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CourseStatus, PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { pagination, paginationResult } from '../common/pagination';
import { courseImageUpload } from '../common/upload.options';
import { MediaStorageService } from '../media/media-storage.service';
import { CacheService } from '../cache/cache.service';
import { TelegramService } from '../telegram/telegram.service';

@ApiTags('courses') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('courses')
export class CoursesController {
  constructor(private readonly prisma: PrismaService, private readonly media: MediaStorageService, private readonly cache: CacheService, private readonly telegram: TelegramService) {}

  @Post(':id/telegram/connect')
  @Roles(Role.ADMIN)
  @Permissions('edit')
  async connectTelegram(@Param('id') id: string) {
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id }, select: { telegramChatId: true } });
    if (!course.telegramChatId) throw new BadRequestException('Save the Telegram chat ID first.');
    return this.telegram.configureWelcomeWebhook(undefined, id);
  }

  private generatedCourseCode() { return `CRS-${randomUUID().slice(0, 8).toUpperCase()}`; }

  private courseBotToken(body: any) {
    const token = String(body.telegramBotToken || '').trim();
    if (token && !/^\d{5,20}:[A-Za-z0-9_-]{20,100}$/.test(token)) {
      throw new BadRequestException('Enter a valid Telegram bot token from BotFather.');
    }
    return token;
  }

  private async saveCourseBot(course: any, body: any, token: string) {
    const id = `course:${course.id}`;
    if (body.removeTelegramBotToken === true || body.removeTelegramBotToken === 'true') {
      await this.prisma.telegramSetting.deleteMany({ where: { id } });
    } else if (token) {
      await this.prisma.telegramSetting.upsert({ where: { id },
        create: { id, botToken: token, chatId: course.telegramChatId || '', enabled: true },
        update: { botToken: token, chatId: course.telegramChatId || '', enabled: true },
      });
    }
  }

  private discountData(body: any, partial = false) {
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const parseDate = (key: string) => {
      const value = body[key];
      if (value === undefined || value === null || value === '') return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Invalid ${key}.`);
      return parsed;
    };
    const data: any = {};
    if (!partial || has('discountPercent')) {
      const value = body.discountPercent === undefined || body.discountPercent === '' ? 0 : Number(body.discountPercent);
      if (!Number.isFinite(value) || value < 0 || value > 99.99) throw new BadRequestException('Discount must be between 0 and 99.99 percent.');
      data.discountPercent = value;
    }
    if (!partial || has('discountStart')) data.discountStart = parseDate('discountStart');
    if (!partial || has('discountEnd')) data.discountEnd = parseDate('discountEnd');
    const start = data.discountStart;
    const end = data.discountEnd;
    if (start && end && end <= start) throw new BadRequestException('Discount end must be after discount start.');
    return data;
  }

  private paymentData(body: any, partial = false) {
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const data: any = {};
    if (!partial || has('paymentEnabled')) data.paymentEnabled = body.paymentEnabled === undefined ? true : body.paymentEnabled === true || body.paymentEnabled === 'true';
    const enabled = body.monthlyPaymentEnabled === true || body.monthlyPaymentEnabled === 'true';
    if (!partial || has('monthlyPaymentEnabled')) data.monthlyPaymentEnabled = enabled;
    if (!partial || has('monthlyPrice')) {
      const raw = body.monthlyPrice;
      if (raw === undefined || raw === null || raw === '') data.monthlyPrice = null;
      else {
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) throw new BadRequestException('Monthly payment amount must be greater than zero.');
        data.monthlyPrice = value;
      }
    }
    if (data.monthlyPaymentEnabled && (!data.monthlyPrice || Number(data.monthlyPrice) <= 0)) throw new BadRequestException('Set a monthly payment amount before enabling monthly payment.');
    return data;
  }

  private catalogData(body: any, partial = false) {
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const text = (key: string, max: number) => {
      if (body[key] === undefined || body[key] === null || body[key] === '') return null;
      const value = String(body[key]).trim();
      if (value.length > max) throw new BadRequestException(`${key} is too long.`);
      return value || null;
    };
    const data: any = {};
    if (!partial || has('category')) data.category = text('category', 100);
    if (!partial || has('level')) data.level = text('level', 40);
    if (!partial || has('tags')) data.tags = text('tags', 1000);
    if (!partial || has('durationWeeks')) {
      const raw = body.durationWeeks;
      if (raw === undefined || raw === null || raw === '') data.durationWeeks = null;
      else {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > 260) throw new BadRequestException('Duration must be between 1 and 260 weeks.');
        data.durationWeeks = value;
      }
    }
    return data;
  }

  @Get()
  async list(@Query() q: any, @CurrentUser() user: any) {
    const { page, limit, skip } = pagination(q.page, q.limit);
    const where: any = {};
    if (q.search) where.OR = [{ courseName: { contains: q.search, mode: 'insensitive' } }, { courseCode: { contains: q.search, mode: 'insensitive' } }];
    if (q.status) where.status = q.status;
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      where.teacherId = teacher.id;
    }
    const [data, total] = await Promise.all([
      this.prisma.course.findMany({ where, skip, take: limit, include: { teacher: { include: { user: { select: { fullName: true } } } }, _count: { select: { enrollments: true, assignments: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.course.count({ where }),
    ]);
    const settings = user.role === Role.ADMIN ? await this.prisma.telegramSetting.findMany({
      where: { id: { in: data.map((course) => `course:${course.id}`) } }, select: { id: true },
    }) : [];
    const configured = new Set(settings.map((setting) => setting.id));
    return paginationResult(data.map((course) => ({ ...course, telegramBotConfigured: configured.has(`course:${course.id}`) })), total, page, limit);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.course.findUniqueOrThrow({ where: { id }, include: { teacher: { include: { user: { select: { fullName: true, email: true } } } }, schedules: true, enrollments: { include: { student: { include: { user: { select: { fullName: true, email: true } } } } } }, assignments: true } });
  }

  @Get(':id/students')
  async students(@Param('id') courseId: string) {
    const enrollments = await this.prisma.enrollment.findMany({ where: { courseId, status: 'ACTIVE' }, include: { student: { include: { user: { select: { id: true, fullName: true, email: true, phone: true, lastSeenAt: true } } } } } });
    const paidPayments = await this.prisma.coursePayment.findMany({ where: { courseId, status: PaymentStatus.PAID, studentId: { in: enrollments.map((enrollment) => enrollment.studentId) } }, select: { studentId: true, paidAt: true }, orderBy: { paidAt: 'desc' } });
    const paidByStudent = new Map(paidPayments.map((payment) => [payment.studentId, payment]));
    return enrollments.map((enrollment) => ({ ...enrollment, student: { ...enrollment.student, user: { ...enrollment.student.user, isOnline: !!enrollment.student.user.lastSeenAt && Date.now() - new Date(enrollment.student.user.lastSeenAt).getTime() <= 90_000 } }, paymentStatus: paidByStudent.has(enrollment.studentId) ? PaymentStatus.PAID : 'MANUAL', paidAt: paidByStudent.get(enrollment.studentId)?.paidAt || null }));
  }

  @Get(':id/assignments')
  assignments(@Param('id') courseId: string) { return this.prisma.assignment.findMany({ where: { courseId }, orderBy: { dueDate: 'asc' } }); }

  @Post()
  @Roles(Role.ADMIN)
  @Permissions('create')
  @UseInterceptors(FileInterceptor('image', courseImageUpload))
  async create(@Body() b: any, @UploadedFile() file?: Express.Multer.File) {
    const botToken = this.courseBotToken(b);
    let uploaded: { url: string } | undefined;
    let course;
    try {
      uploaded = file ? await this.media.upload(file, 'courses') : undefined;
      course = await this.prisma.course.create({ data: { courseCode: this.generatedCourseCode(), courseName: b.courseName, description: b.description, ...this.catalogData(b), teacherId: b.teacherId, startDate: new Date(b.startDate), endDate: new Date(b.endDate), status: b.status ?? CourseStatus.ACTIVE, academicYearId: b.academicYearId, semesterId: b.semesterId, imageUrl: uploaded?.url || b.imageUrl, telegramChatId: typeof b.telegramChatId === 'string' && b.telegramChatId.trim() ? b.telegramChatId.trim() : null, price: b.price === undefined || b.price === '' ? 1 : Number(b.price), currency: String(b.currency || 'USD').toUpperCase(), ...this.discountData(b), ...this.paymentData(b) } });
    } catch (error) {
      if (uploaded?.url) await this.media.remove(uploaded.url);
      throw error;
    }
    await this.saveCourseBot(course, b, botToken);
    await this.cache.invalidatePrefix('cache:storefront:');
    return course;
  }

  @Post(':id/image')
  @Roles(Role.ADMIN)
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('image', courseImageUpload))
  async image(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) { if (!file) throw new BadRequestException('Please select a course image.'); const course = await this.prisma.course.findUniqueOrThrow({ where: { id }, select: { imageUrl: true } }); const uploaded = await this.media.upload(file, 'courses'); const updated = await this.prisma.course.update({ where: { id }, data: { imageUrl: uploaded.url } }); await this.media.remove(course.imageUrl); await this.cache.invalidatePrefix('cache:storefront:'); return updated; }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('image', courseImageUpload))
  async update(@Param('id') id: string, @Body() b: any, @UploadedFile() file?: Express.Multer.File) {
    const botToken = this.courseBotToken(b);
    const previous = file ? await this.prisma.course.findUniqueOrThrow({ where: { id }, select: { imageUrl: true } }) : undefined;
    let uploaded: { url: string } | undefined;
    let course;
    try {
      uploaded = file ? await this.media.upload(file, 'courses') : undefined;
      const data: any = {
        courseName: b.courseName,
        description: b.description,
        ...this.catalogData(b, true),
        teacherId: b.teacherId,
        startDate: b.startDate ? new Date(b.startDate) : undefined,
        endDate: b.endDate ? new Date(b.endDate) : undefined,
        status: b.status,
        academicYearId: b.academicYearId,
        semesterId: b.semesterId,
        telegramChatId: b.telegramChatId === undefined ? undefined : (String(b.telegramChatId).trim() || null),
        price: b.price === undefined || b.price === '' ? undefined : Number(b.price),
        currency: b.currency ? String(b.currency).toUpperCase() : undefined,
        ...this.discountData(b, true),
        ...this.paymentData(b, true),
      };

      // An image sent with the edit form is saved atomically with the course
      // metadata. Never let a partial metadata update clear the current image.
      if (uploaded?.url) data.imageUrl = uploaded.url;
      else if (typeof b.imageUrl === 'string' && b.imageUrl.trim()) data.imageUrl = b.imageUrl.trim();

      course = await this.prisma.course.update({ where: { id }, data });
    } catch (error) {
      if (uploaded?.url) await this.media.remove(uploaded.url);
      throw error;
    }
    await this.saveCourseBot(course, b, botToken);
    if (uploaded?.url) await this.media.remove(previous?.imageUrl);
    await this.cache.invalidatePrefix('cache:storefront:');
    return course;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    const deleted = await this.prisma.$transaction(async (tx) => {
      const course = await tx.course.delete({ where: { id }, select: { id: true } });
      await tx.telegramSetting.deleteMany({ where: { id: `course:${id}` } });
      return course;
    });
    await this.cache.invalidatePrefix('cache:storefront:');
    return deleted;
  }
}
