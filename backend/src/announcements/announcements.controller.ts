import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { pagination, paginationResult } from '../common/pagination';

@ApiTags('announcements') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('create')
  async create(@Body() b: any, @CurrentUser() user: any) {
    if (user.role === Role.TEACHER && !b.courseId) throw new ForbiddenException('Teachers must select one of their assigned courses');
    if (user.role === Role.TEACHER && b.courseId) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      const course = await this.prisma.course.findUniqueOrThrow({ where: { id: b.courseId } });
      if (course.teacherId !== teacher.id) throw new ForbiddenException('You can only announce to your own courses');
    }
    const announcement = await this.prisma.announcement.create({ data: { courseId: b.courseId || null, createdBy: user.id, title: b.title, content: b.content }, include: { course: true, author: { select: { fullName: true, role: true } } } });
    await this.notifications.notifyAnnouncement(announcement, user).catch(() => undefined);
    return announcement;
  }

  @Get()
  async list(@CurrentUser() user: any, @Query() q: any) {
    let where: any = {};
    if (user.role === Role.TEACHER) { const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } }); where = { OR: [{ createdBy: user.id, course: { teacherId: teacher.id } }, { author: { role: Role.ADMIN } }] }; }
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } });
      const enrollments = student ? await this.prisma.enrollment.findMany({ where: { studentId: student.id, status: 'ACTIVE' }, select: { courseId: true } }) : [];
      const courseIds = enrollments.map((enrollment) => enrollment.courseId);
      where = { OR: [{ courseId: null }, ...(courseIds.length ? [{ courseId: { in: courseIds } }] : [])] };
    }
    const paged = q.page !== undefined || q.limit !== undefined;
    const { page, limit, skip } = pagination(q.page, q.limit);
    const [data, total] = await Promise.all([this.prisma.announcement.findMany({ where, skip: paged ? skip : undefined, take: paged ? limit : undefined, include: { course: true, author: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' } }), paged ? this.prisma.announcement.count({ where }) : Promise.resolve(0)]);
    return paged ? paginationResult(data, total, page, limit) : data;
  }

  @Get('course/:courseId')
  byCourse(@Param('courseId') courseId: string) { return this.prisma.announcement.findMany({ where: { courseId }, include: { course: true, author: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' } }); }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('edit')
  async update(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) {
    const announcement = await this.prisma.announcement.findUniqueOrThrow({ where: { id } });
    if (user.role !== Role.ADMIN && announcement.createdBy !== user.id) throw new ForbiddenException('You can only edit your own announcements');
    return this.prisma.announcement.update({ where: { id }, data: { title: b.title, content: b.content, courseId: b.courseId === undefined ? undefined : (b.courseId || null) } });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @Permissions('delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const announcement = await this.prisma.announcement.findUniqueOrThrow({ where: { id } });
    if (user.role !== Role.ADMIN && announcement.createdBy !== user.id) throw new ForbiddenException('You can only delete your own announcements');
    return this.prisma.announcement.delete({ where: { id }, select: { id: true } });
  }
}
