import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('admin')
  @Roles(Role.ADMIN)
  async admin() {
    const [students, teachers, courses, activeCourses, attendance, courseStats] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.course.count(),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.attendance.groupBy({ by: ['status'], _count: true }),
      this.prisma.course.groupBy({ by: ['status'], _count: true }),
    ]);

    return { totals: { students, teachers, courses, activeCourses }, attendance, courseStats };
  }

  @Get('teacher')
  @Roles(Role.TEACHER)
  async teacher(@CurrentUser() user: any) {
    const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
    const courses = await this.prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        status: true,
        startDate: true,
        endDate: true,
        _count: { select: { enrollments: true } },
      },
    });
    const courseIds = courses.map((course) => course.id);
    const [pendingHomework, recentSubmissions, schedules] = await Promise.all([
      this.prisma.submission.count({ where: { status: { in: ['SUBMITTED', 'LATE'] }, assignment: { courseId: { in: courseIds } } } }),
      this.prisma.submission.findMany({
        where: { assignment: { courseId: { in: courseIds } } },
        take: 5,
        select: {
          id: true,
          submittedAt: true,
          status: true,
          student: { select: { user: { select: { fullName: true } } } },
          assignment: { select: { id: true, title: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.classSchedule.findMany({
        where: { courseId: { in: courseIds } },
        include: { course: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
    ]);

    return { courses, totalStudents: courses.reduce((sum, course) => sum + course._count.enrollments, 0), pendingHomework, recentSubmissions, schedules };
  }

  @Get('student')
  @Roles(Role.STUDENT)
  async student(@CurrentUser() user: any) {
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id } });
    const [enrollments, pendingHomework, submissions, attendance, grades, schedules, announcements] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { studentId: student.id, status: 'ACTIVE' }, include: { course: true } }),
      this.prisma.submission.count({ where: { studentId: student.id, grade: { is: null } } }),
      this.prisma.submission.findMany({
        where: { studentId: student.id, grade: { is: null } },
        take: 3,
        include: { assignment: { include: { course: true } }, grade: true },
        orderBy: { assignment: { dueDate: 'asc' } },
      }),
      this.prisma.attendance.groupBy({ by: ['status'], where: { studentId: student.id }, _count: { _all: true } }),
      this.prisma.grade.findMany({
        where: { submission: { studentId: student.id } },
        select: { score: true, submission: { select: { assignment: { select: { maxScore: true } } } } },
      }),
      this.prisma.classSchedule.findMany({
        where: { course: { enrollments: { some: { studentId: student.id, status: 'ACTIVE' } } } },
        take: 3,
        include: { course: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.announcement.findMany({
        where: { OR: [{ courseId: null }, { course: { enrollments: { some: { studentId: student.id, status: 'ACTIVE' } } } }] },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const attendanceCounts = new Map(attendance.map((item) => [item.status, item._count._all]));
    const attendanceTotal = attendance.reduce((total, item) => total + item._count._all, 0);
    const present = attendanceCounts.get('PRESENT') || 0;
    const attendanceSummary = {
      total: attendanceTotal,
      present,
      absent: attendanceCounts.get('ABSENT') || 0,
      late: attendanceCounts.get('LATE') || 0,
      excused: attendanceCounts.get('EXCUSED') || 0,
      percentage: attendanceTotal ? Math.round((present / attendanceTotal) * 100) : 0,
    };
    const averageGrade = grades.length
      ? grades.reduce((sum, grade) => sum + (grade.score / grade.submission.assignment.maxScore) * 100, 0) / grades.length
      : 0;

    return {
      enrolledCourses: enrollments.length,
      pendingHomework,
      attendancePercentage: attendanceSummary.percentage,
      attendanceSummary,
      averageGrade: Math.round(averageGrade),
      enrollments,
      submissions,
      grades,
      schedules,
      announcements,
    };
  }
}
