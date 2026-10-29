import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, SubmissionStatus } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { pagination, paginationResult } from '../common/pagination';
import { homeworkUpload } from '../common/upload.options';

@ApiTags('submissions') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('submissions') export class SubmissionsController {
  constructor(private readonly prisma: PrismaService) {}

  private async studentId(user: any) {
    return (await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id } })).id;
  }

  private async assertStudentOwner(id: string, user: any) {
    const submission = await this.prisma.submission.findUniqueOrThrow({ where: { id }, include: { assignment: true, grade: true } });
    if (user.role === Role.STUDENT && submission.studentId !== await this.studentId(user)) throw new ForbiddenException('You can only manage your own submission');
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      if (submission.assignment.teacherId !== teacher.id) throw new ForbiddenException('You can only manage submissions for your assigned courses');
    }
    return submission;
  }

  private async assertTeacherAssignment(assignmentId: string, user: any) {
    const assignment = await this.prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
    if (user.role !== Role.TEACHER) return assignment;
    const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
    if (assignment.teacherId !== teacher.id) throw new ForbiddenException('You can only access submissions for your assigned courses');
    return assignment;
  }

  private validateFile(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Please attach an image or file');
    const maxBytes = file.mimetype === 'application/pdf' ? 100 * 1024 * 1024 : file.mimetype.startsWith('image/') ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      if (file.path && existsSync(file.path)) unlinkSync(file.path);
      throw new BadRequestException(file.mimetype === 'application/pdf' ? 'PDF files must be 100 MB or smaller' : file.mimetype.startsWith('image/') ? 'Images must be 50 MB or smaller' : 'Files must be 100 MB or smaller');
    }
  }

  private async resolveStudentId(user: any, suppliedStudentId?: string) {
    return user.role === Role.STUDENT ? this.studentId(user) : suppliedStudentId;
  }

  private async assertEnrollment(courseId: string, studentId?: string) {
    if (!studentId) throw new BadRequestException('Please select a student');
    const enrollment = await this.prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId } } });
    if (!enrollment || enrollment.status !== 'ACTIVE') throw new ForbiddenException('Purchase this course before submitting homework.');
    return studentId;
  }

  private async assertStudentSubmissionCanBeReplaced(assignmentId: string, studentId: string, user: any) {
    if (user.role !== Role.STUDENT) return;
    const existing = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: { grade: true },
    });
    if (existing?.grade) throw new BadRequestException('A graded submission cannot be edited');
  }

  private assertBeforeDeadline(assignment: any, user: any, file?: Express.Multer.File) {
    if (user.role === Role.STUDENT && new Date() > new Date(assignment.dueDate)) {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path);
      throw new BadRequestException('The assignment submission deadline has passed');
    }
  }

  private assertStudentCanEdit(submission: any, user: any) {
    if (user.role === Role.STUDENT && submission.grade) {
      throw new BadRequestException('A graded submission cannot be edited');
    }
  }

  @Post() @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT) @Permissions('create') async create(@Body() b: any, @CurrentUser() user: any) {
    const assignment = await this.assertTeacherAssignment(b.assignmentId, user);
    this.assertBeforeDeadline(assignment, user);
    const studentId = await this.assertEnrollment(assignment.courseId, await this.resolveStudentId(user, b.studentId));
    await this.assertStudentSubmissionCanBeReplaced(assignment.id, studentId, user);
    const submittedAt = new Date();
    return this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
      update: { answerText: b.answerText, submittedAt, status: submittedAt > assignment.dueDate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED },
      create: { assignmentId: assignment.id, studentId, answerText: b.answerText, submittedAt, status: submittedAt > assignment.dueDate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED },
    });
  }

  @Post(':assignmentId/upload') @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT) @Permissions('create') @UseInterceptors(FileInterceptor('file', homeworkUpload)) async upload(@Param('assignmentId') assignmentId: string, @Body() b: any, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    this.validateFile(file);
    const assignment = await this.assertTeacherAssignment(assignmentId, user);
    this.assertBeforeDeadline(assignment, user, file);
    const studentId = await this.assertEnrollment(assignment.courseId, await this.resolveStudentId(user, b.studentId));
    await this.assertStudentSubmissionCanBeReplaced(assignmentId, studentId, user);
    const submittedAt = new Date();
    return this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: { answerText: b.answerText !== undefined ? String(b.answerText).trim() : undefined, fileUrl: `/uploads/homework/${file.filename}`, submittedAt, status: submittedAt > assignment.dueDate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED },
      create: { assignmentId, studentId, answerText: b.answerText !== undefined ? String(b.answerText).trim() : undefined, fileUrl: `/uploads/homework/${file.filename}`, submittedAt, status: submittedAt > assignment.dueDate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED },
    });
  }

  @Post(':id/file') @Roles(Role.STUDENT) @Permissions('edit') @UseInterceptors(FileInterceptor('file', homeworkUpload)) async updateFile(@Param('id') id: string, @Body() b: any, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    this.validateFile(file);
    const submission = await this.assertStudentOwner(id, user);
    this.assertStudentCanEdit(submission, user);
    const assignment = await this.prisma.assignment.findUniqueOrThrow({ where: { id: submission.assignmentId } });
    this.assertBeforeDeadline(assignment, user, file);
    const submittedAt = new Date();
    return this.prisma.submission.update({ where: { id }, data: { answerText: b.answerText !== undefined ? String(b.answerText).trim() : undefined, fileUrl: `/uploads/homework/${file.filename}`, submittedAt, status: submittedAt > assignment.dueDate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED } });
  }

  @Get('my') @Roles(Role.STUDENT) async mine(@CurrentUser() user: any) {
    const studentId = await this.studentId(user);
    return this.prisma.submission.findMany({ where: { studentId, assignment: { course: { enrollments: { some: { studentId, status: 'ACTIVE' } } } } }, include: { assignment: { include: { course: true } }, grade: true }, orderBy: { submittedAt: 'desc' } });
  }

  @Get('assignment/:assignmentId') @Roles(Role.ADMIN, Role.TEACHER) async byAssignment(@Param('assignmentId') assignmentId: string, @Query() q: any, @CurrentUser() user: any) {
    await this.assertTeacherAssignment(assignmentId, user);
    const { page, limit, skip } = pagination(q.page, q.limit);
    const where = { assignmentId, ...(q.status ? { status: q.status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({ where, skip, take: limit, include: { student: { include: { user: { select: { fullName: true, email: true } } } }, assignment: { include: { course: true } }, grade: true } }),
      this.prisma.submission.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }

  @Get() @Roles(Role.ADMIN, Role.TEACHER) async list(@Query() q: any, @CurrentUser() user: any) {
    const { page, limit, skip } = pagination(q.page, q.limit);
    const where: any = q.status ? { status: q.status } : {};
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      where.assignment = { teacherId: teacher.id };
    }
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({ where, skip, take: limit, include: { student: { include: { user: { select: { fullName: true } } } }, assignment: { include: { course: true } }, grade: true } }),
      this.prisma.submission.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }

  @Patch(':id') @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT) @Permissions('edit') async update(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) {
    const submission = await this.assertStudentOwner(id, user);
    if (user.role === Role.STUDENT) {
      this.assertStudentCanEdit(submission, user);
      this.assertBeforeDeadline(submission.assignment, user);
      return this.prisma.submission.update({ where: { id }, data: { answerText: b.answerText, submittedAt: new Date(), status: SubmissionStatus.SUBMITTED } });
    }
    return this.prisma.submission.update({ where: { id }, data: { status: b.status } });
  }

  @Patch(':id/status') @Roles(Role.ADMIN, Role.TEACHER) @Permissions('edit') async updateStatus(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) {
    await this.assertStudentOwner(id, user);
    if (!Object.values(SubmissionStatus).includes(b.status)) throw new BadRequestException('Invalid submission status');
    return this.prisma.submission.update({ where: { id }, data: { status: b.status } });
  }

  @Delete(':id') @Roles(Role.ADMIN, Role.STUDENT) @Permissions('delete') async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.assertStudentOwner(id, user);
    return this.prisma.submission.delete({ where: { id }, select: { id: true } });
  }
}
