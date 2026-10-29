import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'; import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'; import { Role } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service'; import { TelegramService } from '../telegram/telegram.service'; import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { Roles } from '../common/decorators/roles.decorator'; import { Permissions } from '../common/decorators/permissions.decorator'; import { CurrentUser } from '../common/decorators/current-user.decorator'; import { pagination, paginationResult } from '../common/pagination';
@ApiTags('attendance') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('attendance') export class AttendanceController { constructor(private readonly prisma: PrismaService, private readonly telegram: TelegramService) {}
  private async assertCourseAccess(courseId: string, user: any) { if (user.role === Role.ADMIN) return; const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } }); const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } }); if (course.teacherId !== teacher.id) throw new ForbiddenException('You can only manage attendance for your assigned courses'); }
  private attendanceDay(value?: string) { const day = value || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(new Date()); const date = new Date(`${day}T00:00:00.000Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) throw new BadRequestException('Invalid attendance date.'); return date; }
  private teacherInclude = { teacher: { include: { user: { select: { id: true, fullName: true, email: true } } } } };
  private async teacherForUser(userId: string) { return this.prisma.teacher.findUniqueOrThrow({ where: { userId } }); }
  private teacherTimestamp(value: any, label: string) { if (!value) return null; const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Invalid ${label}.`); return parsed; }
  private async teacherAction(teacherId: string, action: 'checkIn' | 'checkOut', dateValue?: string, actor?: { fullName?: string; role?: string }) {
    const attendanceDate = this.attendanceDay(dateValue);
    const now = new Date();
    const existing = await this.prisma.teacherAttendance.findUnique({ where: { teacherId_attendanceDate: { teacherId, attendanceDate } } });
    if (action === 'checkIn') {
      if (existing?.checkInAt) return existing;
      if (existing) {
        const updated = await this.prisma.teacherAttendance.update({ where: { id: existing.id }, data: { checkInAt: now, status: 'PRESENT' }, include: this.teacherInclude });
        this.queueAttendanceReport(updated, 'CHECK_IN', actor);
        return updated;
      }
      const created = await this.prisma.teacherAttendance.create({ data: { teacherId, attendanceDate, checkInAt: now, status: 'PRESENT' }, include: this.teacherInclude });
      this.queueAttendanceReport(created, 'CHECK_IN', actor);
      return created;
    }
    if (!existing?.checkInAt) throw new BadRequestException('Teacher must check in before checking out.');
    if (existing.checkOutAt) return existing;
    const updated = await this.prisma.teacherAttendance.update({ where: { id: existing.id }, data: { checkOutAt: now }, include: this.teacherInclude });
    this.queueAttendanceReport(updated, 'CHECK_OUT', actor);
    return updated;
  }

  private queueAttendanceReport(attendance: any, action: 'CHECK_IN' | 'CHECK_OUT', actor?: { fullName?: string; role?: string }) {
    void this.telegram.sendTeacherAttendanceReport({
      action,
      teacherName: attendance.teacher?.user?.fullName || 'Unknown teacher',
      teacherCode: attendance.teacher?.teacherCode,
      attendanceDate: attendance.attendanceDate,
      checkInAt: attendance.checkInAt,
      checkOutAt: attendance.checkOutAt,
      performedBy: actor?.fullName,
      performedByRole: actor?.role,
    }).catch(() => undefined);
  }

  @Get('teacher/me') @Roles(Role.TEACHER) async teacherMe(@CurrentUser() user: any, @Query('date') date?: string) { const teacher = await this.teacherForUser(user.id); return this.prisma.teacherAttendance.findUnique({ where: { teacherId_attendanceDate: { teacherId: teacher.id, attendanceDate: this.attendanceDay(date) } }, include: this.teacherInclude }); }
  @Post('teacher/check-in') @Roles(Role.TEACHER) async teacherCheckIn(@CurrentUser() user: any) { const teacher = await this.teacherForUser(user.id); return this.teacherAction(teacher.id, 'checkIn', undefined, user); }
  @Post('teacher/check-out') @Roles(Role.TEACHER) async teacherCheckOut(@CurrentUser() user: any) { const teacher = await this.teacherForUser(user.id); return this.teacherAction(teacher.id, 'checkOut', undefined, user); }
  @Get('teachers') @Roles(Role.ADMIN) async teacherList(@Query('date') date?: string) { const attendanceDate = this.attendanceDay(date); const teachers = await this.prisma.teacher.findMany({ include: { user: { select: { id: true, fullName: true, email: true } }, teacherAttendance: { where: { attendanceDate }, take: 1 } }, orderBy: { createdAt: 'asc' } }); return teachers.map(({ teacherAttendance, ...teacher }) => ({ ...teacher, attendance: teacherAttendance[0] || null })); }
  @Post('teachers/:teacherId/check-in') @Roles(Role.ADMIN) teacherAdminCheckIn(@Param('teacherId') teacherId: string, @Body() body: any, @CurrentUser() user: any) { return this.teacherAction(teacherId, 'checkIn', body?.date, user); }
  @Post('teachers/:teacherId/check-out') @Roles(Role.ADMIN) teacherAdminCheckOut(@Param('teacherId') teacherId: string, @Body() body: any, @CurrentUser() user: any) { return this.teacherAction(teacherId, 'checkOut', body?.date, user); }
  @Patch('teachers/:teacherId') @Roles(Role.ADMIN) @Permissions('edit') async updateTeacherAttendance(@Param('teacherId') teacherId: string, @Body() b: any) { await this.prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } }); const attendanceDate = this.attendanceDay(b.attendanceDate || b.date); const checkInAt = this.teacherTimestamp(b.checkInAt, 'check-in time'); const checkOutAt = this.teacherTimestamp(b.checkOutAt, 'check-out time'); if (checkInAt && checkOutAt && checkOutAt < checkInAt) throw new BadRequestException('Check-out time must be after check-in time.'); const allowedStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']; const status = b.status || 'PRESENT'; if (!allowedStatuses.includes(status)) throw new BadRequestException('Invalid attendance status.'); return this.prisma.teacherAttendance.upsert({ where: { teacherId_attendanceDate: { teacherId, attendanceDate } }, update: { checkInAt, checkOutAt, status: status as any, note: b.note ?? null }, create: { teacherId, attendanceDate, checkInAt, checkOutAt, status: status as any, note: b.note ?? null }, include: this.teacherInclude }); }
  @Post() @Roles(Role.ADMIN, Role.TEACHER) @Permissions('create') async create(@Body() b: any, @CurrentUser() user: any) { await this.assertCourseAccess(b.courseId, user); return this.prisma.attendance.upsert({ where: { courseId_studentId_attendanceDate: { courseId: b.courseId, studentId: b.studentId, attendanceDate: new Date(b.attendanceDate) } }, update: { status: b.status, note: b.note }, create: { courseId: b.courseId, studentId: b.studentId, attendanceDate: new Date(b.attendanceDate), status: b.status, note: b.note } }); }
  @Post('bulk') @Roles(Role.ADMIN, Role.TEACHER) @Permissions('create') async bulk(@Body() b: { courseId: string; attendanceDate: string; records: Array<{ studentId: string; status: string; note?: string }> }, @CurrentUser() user: any) { await this.assertCourseAccess(b.courseId, user); const date = new Date(b.attendanceDate); const result = await this.prisma.$transaction(b.records.map((r) => this.prisma.attendance.upsert({ where: { courseId_studentId_attendanceDate: { courseId: b.courseId, studentId: r.studentId, attendanceDate: date } }, update: { status: r.status as any, note: r.note }, create: { courseId: b.courseId, studentId: r.studentId, attendanceDate: date, status: r.status as any, note: r.note } }))); return { count: result.length }; }
  @Get() @Roles(Role.ADMIN, Role.TEACHER) async list(@CurrentUser() user: any, @Query() q: any) { const where: any = {}; if (user.role === Role.TEACHER) { const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } }); where.course = { teacherId: teacher.id }; } return this.listRows(where, q); }
  @Get('course/:courseId') byCourse(@Param('courseId') courseId: string) { return this.prisma.attendance.findMany({ where: { courseId }, include: { student: { include: { user: { select: { fullName: true } } } } }, orderBy: { attendanceDate: 'desc' } }); }
  @Get('student/:studentId') byStudent(@Param('studentId') studentId: string, @Query() q: any) { return this.listRows({ studentId }, q, { course: true }); }
  @Get('me') @Roles(Role.STUDENT) async me(@CurrentUser() user: any, @Query() q: any) { const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id } }); return this.byStudent(student.id, q); }
  private async listRows(where: any, q: any, include: any = { course: true, student: { include: { user: { select: { fullName: true, email: true } } } } }) { const paged = q.page !== undefined || q.limit !== undefined; const { page, limit, skip } = pagination(q.page, q.limit); const [data, total] = await Promise.all([this.prisma.attendance.findMany({ where, skip: paged ? skip : undefined, take: paged ? limit : undefined, include, orderBy: { attendanceDate: 'desc' } }), paged ? this.prisma.attendance.count({ where }) : Promise.resolve(0)]); return paged ? paginationResult(data, total, page, limit) : data; }
  @Get('student/:studentId/summary') async summary(@Param('studentId') studentId: string) { const rows = await this.prisma.attendance.findMany({ where: { studentId } }); const present = rows.filter((r) => r.status === 'PRESENT').length; return { total: rows.length, present, absent: rows.filter((r) => r.status === 'ABSENT').length, late: rows.filter((r) => r.status === 'LATE').length, excused: rows.filter((r) => r.status === 'EXCUSED').length, percentage: rows.length ? Math.round((present / rows.length) * 100) : 0 }; }
  @Patch(':id') @Roles(Role.ADMIN, Role.TEACHER) @Permissions('edit') async update(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) { const existing = await this.prisma.attendance.findUniqueOrThrow({ where: { id } }); await this.assertCourseAccess(existing.courseId, user); return this.prisma.attendance.update({ where: { id }, data: b }); }
  @Delete(':id') @Roles(Role.ADMIN, Role.TEACHER) @Permissions('delete') async remove(@Param('id') id: string, @CurrentUser() user: any) { const existing = await this.prisma.attendance.findUniqueOrThrow({ where: { id } }); await this.assertCourseAccess(existing.courseId, user); return this.prisma.attendance.delete({ where: { id }, select: { id: true } }); }
}
