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

@ApiTags('courses') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('courses')
export class CoursesController {
  constructor(private readonly prisma: PrismaService) {}

  private generatedCourseCode() { return `CRS-${randomUUID().slice(0, 8).toUpperCase()}`; }

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
    return paginationResult(data, total, page, limit);
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
  create(@Body() b: any) {
    return this.prisma.course.create({ data: { courseCode: this.generatedCourseCode(), courseName: b.courseName, description: b.description, teacherId: b.teacherId, startDate: new Date(b.startDate), endDate: new Date(b.endDate), status: b.status ?? CourseStatus.ACTIVE, academicYearId: b.academicYearId, semesterId: b.semesterId, imageUrl: b.imageUrl, price: b.price === undefined || b.price === '' ? 1 : Number(b.price), currency: String(b.currency || 'USD').toUpperCase(), ...this.discountData(b), ...this.paymentData(b) } });
  }

  @Post(':id/image')
  @Roles(Role.ADMIN)
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('image', courseImageUpload))
  image(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.prisma.course.update({ where: { id }, data: { imageUrl: `/uploads/courses/${file.filename}` } }); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Permissions('edit')
  update(@Param('id') id: string, @Body() b: any) {
    return this.prisma.course.update({ where: { id }, data: { courseName: b.courseName, description: b.description, teacherId: b.teacherId, startDate: b.startDate ? new Date(b.startDate) : undefined, endDate: b.endDate ? new Date(b.endDate) : undefined, status: b.status, academicYearId: b.academicYearId, semesterId: b.semesterId, imageUrl: b.imageUrl, price: b.price === undefined || b.price === '' ? undefined : Number(b.price), currency: b.currency ? String(b.currency).toUpperCase() : undefined, ...this.discountData(b, true), ...this.paymentData(b, true) } });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) { return this.prisma.course.delete({ where: { id }, select: { id: true } }); }
}
