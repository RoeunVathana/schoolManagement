import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DayOfWeek, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { isLearnerRole } from '../common/learner-roles';
import { pagination, paginationResult } from '../common/pagination';

const days = (value: unknown): DayOfWeek[] => {
  const selected = Array.isArray(value) ? value : [value];
  const unique = [...new Set(selected.map((day) => String(day)))];
  if (!unique.length || unique.some((day) => !Object.values(DayOfWeek).includes(day as DayOfWeek))) {
    throw new BadRequestException('Select at least one valid day.');
  }
  return unique as DayOfWeek[];
};

const normalizeTime = (value: unknown, label: string) => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) throw new BadRequestException(`${label} must use a valid time.`);

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || (meridiem && (hour < 1 || hour > 12)) || (!meridiem && hour > 23)) {
    throw new BadRequestException(`${label} must use a valid time.`);
  }
  if (meridiem) hour = meridiem === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
  return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, minutes: hour * 60 + minute };
};

const optionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const scheduleData = (body: any, fallback: any = {}) => {
  const source = { ...fallback, ...body };
  const courseId = String(source.courseId ?? '').trim();
  if (!courseId) throw new BadRequestException('Please select a course.');

  const selectedDays = days(source.dayOfWeek);
  const start = normalizeTime(source.startTime, 'Start time');
  const end = normalizeTime(source.endTime, 'End time');
  if (end.minutes <= start.minutes) throw new BadRequestException('End time must be after start time.');

  return {
    courseId,
    dayOfWeek: selectedDays,
    startTime: start.value,
    endTime: end.value,
    room: optionalText(source.room),
    description: optionalText(source.description),
  };
};

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('The selected course was not found. Please refresh the course list and try again.');
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() body: any) {
    const data = scheduleData(body);
    await this.assertCourse(data.courseId);
    return this.prisma.$transaction(data.dayOfWeek.map((dayOfWeek) => this.prisma.classSchedule.create({ data: { ...data, dayOfWeek } })));
  }

  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const where: any = {};
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      where.course = { teacherId: teacher.id };
    }
    if (isLearnerRole(user.role)) {
      const student = await this.prisma.student.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      where.course = { enrollments: { some: { studentId: student.id, status: 'ACTIVE' } } };
    }
    const paged = query.page !== undefined || query.limit !== undefined;
    const { page, limit, skip } = pagination(query.page, query.limit);
    const [data, total] = await Promise.all([
      this.prisma.classSchedule.findMany({ where, skip, take: paged ? limit : undefined, include: { course: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
      paged ? this.prisma.classSchedule.count({ where }) : Promise.resolve(0),
    ]);
    return paged ? paginationResult(data, total, page, limit) : data;
  }

  @Get('course/:courseId')
  byCourse(@Param('courseId') courseId: string) {
    return this.prisma.classSchedule.findMany({ where: { courseId }, orderBy: { startTime: 'asc' } });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() body: any) {
    const current = await this.prisma.classSchedule.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('The schedule was not found.');
    const data = scheduleData(body, current);
    await this.assertCourse(data.courseId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.classSchedule.update({ where: { id }, data: { ...data, dayOfWeek: data.dayOfWeek[0] } });
      const additional = await Promise.all(data.dayOfWeek.slice(1).map((dayOfWeek) => tx.classSchedule.create({ data: { ...data, dayOfWeek } })));
      return [updated, ...additional];
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.prisma.classSchedule.delete({ where: { id }, select: { id: true } });
  }
}
