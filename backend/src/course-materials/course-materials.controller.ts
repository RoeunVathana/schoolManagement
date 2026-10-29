import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { pagination, paginationResult } from '../common/pagination';
import { courseMaterialUpload } from '../common/upload.options';

@ApiTags('course-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('course-materials')
export class CourseMaterialsController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCourseAccess(courseId: string, user: any) {
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      if (course.teacherId !== teacher.id) throw new ForbiddenException('You can only manage materials for your courses.');
    }
    return course;
  }

  private async assertMaterialAccess(id: string, user: any) {
    const material = await this.prisma.courseMaterial.findUniqueOrThrow({ where: { id } });
    await this.assertCourseAccess(material.courseId, user);
    return material;
  }

  @Get()
  async list(@Query() query: any, @CurrentUser() user: any) {
    const { page, limit, skip } = pagination(query.page, query.limit);
    const where: any = query.courseId ? { courseId: query.courseId } : {};
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { userId: user.id } });
      where.course = { teacherId: teacher.id };
    }
    const [data, total] = await Promise.all([
      this.prisma.courseMaterial.findMany({ where, skip, take: limit, include: { course: { select: { id: true, courseName: true, courseCode: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.courseMaterial.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }

  @Post('upload')
  @Permissions('create')
  @UseInterceptors(FileInterceptor('file', courseMaterialUpload))
  async upload(@Body() body: any, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: any) {
    if (!body.courseId) throw new BadRequestException('Please select a course.');
    if (!body.title?.trim()) throw new BadRequestException('Please enter a material title.');
    if (!file) throw new BadRequestException('Please select a slide, PDF, book or lesson file.');
    await this.assertCourseAccess(body.courseId, user);
    return this.prisma.courseMaterial.create({
      data: {
        courseId: body.courseId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        fileUrl: `/uploads/course-materials/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
      include: { course: { select: { id: true, courseName: true, courseCode: true } } },
    });
  }

  @Patch(':id')
  @Permissions('edit')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    await this.assertMaterialAccess(id, user);
    if (!body.title?.trim()) throw new BadRequestException('Please enter a material title.');
    return this.prisma.courseMaterial.update({ where: { id }, data: { title: body.title.trim(), description: body.description?.trim() || null }, include: { course: { select: { id: true, courseName: true, courseCode: true } } } });
  }

  @Post(':id/file')
  @Permissions('edit')
  @UseInterceptors(FileInterceptor('file', courseMaterialUpload))
  async replaceFile(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: any) {
    const material = await this.assertMaterialAccess(id, user);
    if (!file) throw new BadRequestException('Please select a replacement file.');
    if (material.fileUrl && existsSync(material.fileUrl.replace(/^\/uploads\//, 'uploads/'))) unlinkSync(material.fileUrl.replace(/^\/uploads\//, 'uploads/'));
    return this.prisma.courseMaterial.update({ where: { id }, data: { fileUrl: `/uploads/course-materials/${file.filename}`, originalName: file.originalname, mimeType: file.mimetype, fileSize: file.size }, include: { course: { select: { id: true, courseName: true, courseCode: true } } } });
  }

  @Delete(':id')
  @Permissions('delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const material = await this.assertMaterialAccess(id, user);
    if (material.fileUrl && existsSync(material.fileUrl.replace(/^\/uploads\//, 'uploads/'))) unlinkSync(material.fileUrl.replace(/^\/uploads\//, 'uploads/'));
    return this.prisma.courseMaterial.delete({ where: { id }, select: { id: true } });
  }
}
