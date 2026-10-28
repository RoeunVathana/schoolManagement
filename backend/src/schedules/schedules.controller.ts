import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'; import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'; import { Role } from '@prisma/client'; import { PrismaService } from '../prisma/prisma.service'; import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; import { RolesGuard } from '../common/guards/roles.guard'; import { Roles } from '../common/decorators/roles.decorator';
const mins = (v: string) => { const [h, m] = String(v).split(':').map(Number); return h * 60 + m; };
@ApiTags('schedules') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
@Controller('schedules') export class SchedulesController { constructor(private readonly prisma: PrismaService) {}
  @Post() @Roles(Role.ADMIN) create(@Body() b: any) { if (mins(b.endTime) <= mins(b.startTime)) throw new Error('endTime must be after startTime'); return this.prisma.classSchedule.create({ data: b }); }
  @Get() list() { return this.prisma.classSchedule.findMany({ include: { course: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }); }
  @Get('course/:courseId') byCourse(@Param('courseId') courseId: string) { return this.prisma.classSchedule.findMany({ where: { courseId }, orderBy: { startTime: 'asc' } }); }
  @Patch(':id') @Roles(Role.ADMIN) update(@Param('id') id: string, @Body() b: any) { if (b.endTime && b.startTime && mins(b.endTime) <= mins(b.startTime)) throw new Error('endTime must be after startTime'); return this.prisma.classSchedule.update({ where: { id }, data: b }); }
  @Delete(':id') @Roles(Role.ADMIN) remove(@Param('id') id: string) { return this.prisma.classSchedule.delete({ where: { id }, select: { id: true } }); }
}
