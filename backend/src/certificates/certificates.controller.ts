import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EnrollmentStatus, Role } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { pagination, paginationResult } from '../common/pagination';
import { certificateUpload } from '../common/upload.options';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly prisma: PrismaService) {}

  private async studentId(user: any) {
    return (await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } })).id;
  }

  private async assertCourseAccess(courseId: string, user: any) {
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      if (course.teacherId !== teacher.id) throw new ForbiddenException('You can only manage certificates for your courses.');
    }
    return course;
  }

  private async assertCertificateAccess(id: string, user: any) {
    const certificate = await this.prisma.courseCertificate.findUniqueOrThrow({ where: { id }, include: { course: true } });
    if (user.role === Role.TEACHER) await this.assertCourseAccess(certificate.courseId, user);
    if (user.role === Role.STUDENT && certificate.studentId !== await this.studentId(user)) throw new ForbiddenException('You can only access your own certificates.');
    return certificate;
  }

  private removeFile(fileUrl?: string | null) {
    if (!fileUrl) return;
    const path = fileUrl.replace(/^\/uploads\//, 'uploads/');
    if (existsSync(path)) unlinkSync(path);
  }

  private async assertEnrollment(courseId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId } } });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) throw new BadRequestException('The student must be enrolled in this course before receiving a certificate.');
    return enrollment;
  }

  @Get('my')
  @Roles(Role.STUDENT)
  async mine(@CurrentUser() user: any) {
    const studentId = await this.studentId(user);
    return this.prisma.courseCertificate.findMany({ where: { studentId }, include: { course: { select: { id: true, courseCode: true, courseName: true, teacher: { include: { user: { select: { fullName: true } } } } } } }, orderBy: { issuedAt: 'desc' } });
  }

  @Get(':id/file')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async download(@Param('id') id: string, @CurrentUser() user: any, @Res() response: Response) {
    const certificate = await this.assertCertificateAccess(id, user);
    const fileName = basename(certificate.fileUrl || '');
    const filePath = join(process.cwd(), 'uploads', 'certificates', fileName);
    if (!fileName || !existsSync(filePath)) throw new NotFoundException('Certificate file was not found.');
    return response.download(filePath, certificate.originalName || 'certificate', (error) => {
      if (error && !response.headersSent) response.status(404).json({ success: false, message: 'Certificate file was not found.', statusCode: 404 });
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  async list(@Query() query: any, @CurrentUser() user: any) {
    const { page, limit, skip } = pagination(query.page, query.limit);
    const where: any = query.courseId ? { courseId: query.courseId } : {};
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      where.course = { teacherId: teacher.id };
    }
    const [data, total] = await Promise.all([
      this.prisma.courseCertificate.findMany({ where, skip, take: limit, include: { course: { select: { id: true, courseCode: true, courseName: true } }, student: { include: { user: { select: { fullName: true, email: true } } } } }, orderBy: { issuedAt: 'desc' } }),
      this.prisma.courseCertificate.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }

  @Post('upload')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('create')
  @UseInterceptors(FileInterceptor('file', certificateUpload))
  async upload(@Body() body: any, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: any) {
    if (!body.courseId) throw new BadRequestException('Please select a course.');
    if (!body.studentId) throw new BadRequestException('Please select a student.');
    if (!body.title?.trim()) throw new BadRequestException('Please enter a certificate title.');
    if (!file) throw new BadRequestException('Please upload a PDF or image certificate.');
    const course = await this.assertCourseAccess(body.courseId, user);
    await this.assertEnrollment(body.courseId, body.studentId);
    const existing = await this.prisma.courseCertificate.findUnique({ where: { courseId_studentId: { courseId: body.courseId, studentId: body.studentId } } });
    if (existing) this.removeFile(existing.fileUrl);
    const certificate = await this.prisma.courseCertificate.upsert({
      where: { courseId_studentId: { courseId: body.courseId, studentId: body.studentId } },
      update: { title: body.title.trim(), description: body.description?.trim() || null, fileUrl: `/uploads/certificates/${file.filename}`, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size, issuedAt: new Date() },
      create: { courseId: body.courseId, studentId: body.studentId, title: body.title.trim(), description: body.description?.trim() || null, fileUrl: `/uploads/certificates/${file.filename}`, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size },
      include: { course: { select: { id: true, courseCode: true, courseName: true } }, student: { include: { user: { select: { fullName: true, email: true } } } } },
    });
    const student = await this.prisma.student.findUnique({ where: { id: body.studentId }, select: { userId: true } });
    if (student) await this.prisma.notification.create({ data: { userId: student.userId, senderId: user.id, title: 'Certificate available', message: `Your certificate for ${course.courseName} is ready to view and download.` } });
    return certificate;
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('edit')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    await this.assertCertificateAccess(id, user);
    if (!body.title?.trim()) throw new BadRequestException('Please enter a certificate title.');
    return this.prisma.courseCertificate.update({ where: { id }, data: { title: body.title.trim(), description: body.description?.trim() || null }, include: { course: { select: { id: true, courseCode: true, courseName: true } }, student: { include: { user: { select: { fullName: true, email: true } } } } } });
  }

  @Post(':id/file')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('file', certificateUpload))
  async replaceFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: any) {
    const certificate = await this.assertCertificateAccess(id, user);
    if (!file) throw new BadRequestException('Please upload a replacement certificate.');
    this.removeFile(certificate.fileUrl);
    return this.prisma.courseCertificate.update({ where: { id }, data: { fileUrl: `/uploads/certificates/${file.filename}`, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size, issuedAt: new Date() }, include: { course: { select: { id: true, courseCode: true, courseName: true } }, student: { include: { user: { select: { fullName: true, email: true } } } } } });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const certificate = await this.assertCertificateAccess(id, user);
    this.removeFile(certificate.fileUrl);
    return this.prisma.courseCertificate.delete({ where: { id }, select: { id: true } });
  }
}
