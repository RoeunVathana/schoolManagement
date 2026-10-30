import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { examSubmissionUpload } from '../common/upload.options';
import { isLearnerRole } from '../common/learner-roles';

@ApiTags('exam-results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('exam-results')
export class ExamResultsController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertExamAccess(examId: string, user: any) {
    const exam = await this.prisma.exam.findUniqueOrThrow({ where: { id: examId }, include: { course: true } });
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      if (exam.course.teacherId !== teacher.id) throw new ForbiddenException('You can only manage results for your assigned courses');
    }
    return exam;
  }

  private async assertStudentExamAccess(examId: string, user: any) {
    const exam = await this.assertExamAccess(examId, user);
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
    await this.prisma.enrollment.findFirstOrThrow({ where: { courseId: exam.courseId, studentId: student.id, status: 'ACTIVE' } });
    return { exam, student };
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('create')
  async create(@Body() b: any, @CurrentUser() user: any) {
    const exam = await this.assertExamAccess(b.examId, user);
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < 0 || score > exam.maxScore) throw new BadRequestException(`Score must be between 0 and ${exam.maxScore}`);
    return this.prisma.examResult.upsert({
      where: { examId_studentId: { examId: b.examId, studentId: b.studentId } },
      update: { score, feedback: b.feedback },
      create: { examId: b.examId, studentId: b.studentId, score, feedback: b.feedback },
    });
  }

  @Post('submit')
  @Roles(Role.STUDENT)
  @Permissions('create')
  async submit(@Body() b: { examId: string; answerText?: string }, @CurrentUser() user: any) {
    const { exam, student } = await this.assertStudentExamAccess(b.examId, user);
    if (exam.submissionDeadline && new Date() > exam.submissionDeadline) throw new BadRequestException('The exam submission deadline has passed');
    const existing = await this.prisma.examResult.findUnique({ where: { examId_studentId: { examId: exam.id, studentId: student.id } } });
    if (existing?.score !== null && existing?.score !== undefined) throw new BadRequestException('This exam has already been graded and cannot be resubmitted');
    return this.prisma.examResult.upsert({
      where: { examId_studentId: { examId: exam.id, studentId: student.id } },
      update: { answerText: b.answerText?.trim() || null, submittedAt: new Date() },
      create: { examId: exam.id, studentId: student.id, score: null, answerText: b.answerText?.trim() || null, submittedAt: new Date() },
      include: { exam: { include: { course: true } } },
    });
  }

  @Patch('submit/:id')
  @Roles(Role.STUDENT)
  @Permissions('edit')
  async updateSubmission(@Param('id') id: string, @Body() b: { answerText?: string }, @CurrentUser() user: any) {
    const result = await this.prisma.examResult.findUniqueOrThrow({ where: { id }, include: { student: true } });
    if (result.student.userId !== user.id) throw new ForbiddenException('You can only update your own exam submission');
    const { exam } = await this.assertStudentExamAccess(result.examId, user);
    if (result.score !== null && result.score !== undefined) throw new BadRequestException('This exam has already been graded and cannot be resubmitted');
    if (exam.submissionDeadline && new Date() > exam.submissionDeadline) throw new BadRequestException('The exam submission deadline has passed');
    return this.prisma.examResult.update({
      where: { id },
      data: { answerText: b.answerText?.trim() || null, submittedAt: new Date() },
      include: { exam: { include: { course: true } } },
    });
  }

  @Post(':id/file')
  @Roles(Role.STUDENT)
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('file', examSubmissionUpload))
  async uploadSubmissionFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) throw new BadRequestException('Please choose an exam answer file');
    const result = await this.prisma.examResult.findUniqueOrThrow({ where: { id }, include: { exam: true, student: true } });
    if (result.student.userId !== user.id) throw new ForbiddenException('You can only update your own exam submission');
    if (result.score !== null && result.score !== undefined) throw new BadRequestException('This exam has already been graded and cannot be resubmitted');
    const { exam } = await this.assertStudentExamAccess(result.examId, user);
    if (exam.submissionDeadline && new Date() > exam.submissionDeadline) throw new BadRequestException('The exam submission deadline has passed');
    return this.prisma.examResult.update({ where: { id }, data: { fileUrl: `/uploads/exam-submissions/${file.filename}`, submittedAt: new Date() }, include: { exam: { include: { course: true } } } });
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('create')
  async bulk(@Body() b: { examId: string; results: Array<{ studentId: string; score: number; feedback?: string }> }, @CurrentUser() user: any) {
    const exam = await this.assertExamAccess(b.examId, user);
    return Promise.all(b.results.map((r) => {
      const score = Number(r.score);
      if (!Number.isFinite(score) || score < 0 || score > exam.maxScore) throw new BadRequestException(`Score must be between 0 and ${exam.maxScore}`);
      return this.prisma.examResult.upsert({
        where: { examId_studentId: { examId: b.examId, studentId: r.studentId } },
        update: { score, feedback: r.feedback },
        create: { examId: b.examId, studentId: r.studentId, score, feedback: r.feedback },
      });
    }));
  }

  @Get('student/:studentId')
  byStudent(@Param('studentId') studentId: string) {
    return this.prisma.examResult.findMany({ where: { studentId }, include: { exam: { include: { course: true } } }, orderBy: { createdAt: 'desc' } });
  }

  @Get('me')
  @Roles(Role.STUDENT)
  async me(@CurrentUser() user: any) {
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
    const exams = await this.prisma.exam.findMany({
      where: { course: { enrollments: { some: { studentId: student.id, status: 'ACTIVE' } } } },
      include: { course: true, results: { where: { studentId: student.id }, take: 1 } },
      orderBy: { examDate: 'asc' },
    });

    return exams.map((exam) => {
      const result = exam.results[0];
      return {
        id: result?.id || `pending-${exam.id}-${student.id}`,
        examId: exam.id,
        studentId: student.id,
        score: result?.score ?? null,
        feedback: result?.feedback ?? null,
        answerText: result?.answerText ?? null,
        fileUrl: result?.fileUrl ?? null,
        submittedAt: result?.submittedAt ?? null,
        createdAt: result?.createdAt ?? null,
        exam: {
          id: exam.id,
          courseId: exam.courseId,
          title: exam.title,
          examDate: exam.examDate,
          submissionDeadline: exam.submissionDeadline,
          maxScore: exam.maxScore,
          description: exam.description,
          imageUrl: exam.imageUrl,
          course: exam.course,
        },
      };
    });
  }

  @Get('exam/:examId')
  async byExam(@Param('examId') examId: string, @CurrentUser() user: any) {
    const exam = await this.assertExamAccess(examId, user);
    if (isLearnerRole(user.role)) {
      const { student } = await this.assertStudentExamAccess(examId, user);
      return this.prisma.examResult.findMany({ where: { examId, studentId: student.id }, include: { exam: { include: { course: true } }, student: { include: { user: { select: { fullName: true } } } } } });
    }
    return this.prisma.examResult.findMany({ where: { examId }, include: { exam: { include: { course: true } }, student: { include: { user: { select: { fullName: true } } } } }, orderBy: { student: { user: { fullName: 'asc' } } } });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('edit')
  async update(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) {
    const result = await this.prisma.examResult.findUniqueOrThrow({ where: { id }, include: { exam: true } });
    const exam = await this.assertExamAccess(result.examId, user);
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < 0 || score > exam.maxScore) throw new BadRequestException(`Score must be between 0 and ${exam.maxScore}`);
    return this.prisma.examResult.update({ where: { id }, data: { score, feedback: b.feedback } });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.prisma.examResult.findUniqueOrThrow({ where: { id } });
    await this.assertExamAccess(result.examId, user);
    return this.prisma.examResult.delete({ where: { id }, select: { id: true } });
  }
}
