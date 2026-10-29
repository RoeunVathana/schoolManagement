import { Controller, ForbiddenException, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getCoursePricing } from '../common/course-pricing';
import { PaymentService } from '../payments/payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly prisma: PrismaService, private readonly payments: PaymentService) {}

  private withPricing(course: any) {
    const pricing = getCoursePricing(course);
    return { ...course, ...pricing };
  }

  @Get('courses')
  async listCourses(@Query('search') search?: string) {
    const term = search?.trim();
    const courses = await this.prisma.course.findMany({
      where: {
        status: 'ACTIVE',
        ...(term
          ? {
              OR: [
                { courseName: { contains: term, mode: 'insensitive' } },
                { courseCode: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        description: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        price: true,
        currency: true,
        discountPercent: true,
        discountStart: true,
        discountEnd: true,
        monthlyPaymentEnabled: true,
        monthlyPrice: true,
        teacher: { select: { specialization: true, user: { select: { fullName: true, profileImageUrl: true } } } },
        _count: { select: { enrollments: true, assignments: true, exams: true, materials: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map((course) => this.withPricing(course));
  }

  @Get('courses/:id')
  async getCourse(@Param('id') id: string) {
    const course = await this.prisma.course.findFirstOrThrow({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        description: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        price: true,
        currency: true,
        discountPercent: true,
        discountStart: true,
        discountEnd: true,
        monthlyPaymentEnabled: true,
        monthlyPrice: true,
        teacher: { select: { specialization: true, user: { select: { fullName: true, email: true, profileImageUrl: true } } } },
        _count: { select: { enrollments: true } },
      },
    });
    return this.withPricing(course);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('courses/:id/access')
  async getCourseAccess(@Param('id') id: string, @CurrentUser() user: any) {
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
    const enrollment = await this.prisma.enrollment.findFirst({ where: { courseId: id, studentId: student.id, status: 'ACTIVE' }, select: { id: true } });
    if (!enrollment) throw new ForbiddenException('Purchase this course before viewing learning content');

    const course = await this.prisma.course.findFirstOrThrow({
      where: { id, status: 'ACTIVE' },
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        description: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        price: true,
        currency: true,
        discountPercent: true,
        discountStart: true,
        discountEnd: true,
        monthlyPaymentEnabled: true,
        monthlyPrice: true,
        teacher: { select: { specialization: true, user: { select: { fullName: true, email: true, profileImageUrl: true } } } },
        schedules: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true }, orderBy: { dayOfWeek: 'asc' } },
        assignments: { select: { id: true, title: true, description: true, maxScore: true }, orderBy: { createdAt: 'asc' } },
        exams: { select: { id: true, title: true, examDate: true, maxScore: true }, orderBy: { examDate: 'asc' } },
        materials: { select: { id: true, title: true, description: true, fileUrl: true, originalName: true, mimeType: true, fileSize: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { enrollments: true, assignments: true, exams: true, materials: true } },
      },
    });
    return this.withPricing(course);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post('courses/:courseId/checkout')
  checkout(@Param('courseId') courseId: string, @CurrentUser() user: any, @Query('refresh') refresh?: string, @Query('plan') plan?: string) {
    return this.payments.createCoursePayment(courseId, user.id, refresh === '1' || refresh === 'true', plan);
  }
}
