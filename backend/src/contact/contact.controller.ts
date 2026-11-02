import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContactMessageStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { pagination, paginationResult } from '../common/pagination';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() body: any) {
    const data = this.validatePublicMessage(body);
    return this.prisma.contactMessage.create({
      data,
      select: { id: true, status: true, createdAt: true },
    });
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async listAdmin(@Query() query: any) {
    const { page, limit, skip } = pagination(query.page, query.limit);
    const where: any = {};
    const search = String(query.search || '').trim();

    if (query.status) {
      if (!Object.values(ContactMessageStatus).includes(query.status as ContactMessageStatus)) {
        throw new BadRequestException('Invalid contact message status.');
      }
      where.status = query.status;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contactMessage.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return paginationResult(data, total, page, limit);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdmin(@Param('id') id: string) {
    return this.prisma.contactMessage.findUniqueOrThrow({ where: { id } });
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateAdmin(@Param('id') id: string, @Body() body: any) {
    const existing = await this.prisma.contactMessage.findUniqueOrThrow({ where: { id } });
    const data: any = {};

    if (body.status !== undefined) {
      if (!Object.values(ContactMessageStatus).includes(body.status as ContactMessageStatus)) {
        throw new BadRequestException('Invalid contact message status.');
      }
      data.status = body.status;
      if (body.status !== ContactMessageStatus.NEW && !existing.readAt) data.readAt = new Date();
      if (body.status === ContactMessageStatus.RESOLVED && !existing.respondedAt) data.respondedAt = new Date();
    }

    if (body.adminNote !== undefined) {
      if (body.adminNote === null) data.adminNote = null;
      else data.adminNote = String(body.adminNote).trim().slice(0, 4000);
    }

    return this.prisma.contactMessage.update({ where: { id }, data });
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeAdmin(@Param('id') id: string) {
    return this.prisma.contactMessage.delete({ where: { id }, select: { id: true } });
  }

  private validatePublicMessage(body: any) {
    const fullName = String(body?.fullName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();

    if (fullName.length < 2 || fullName.length > 120) throw new BadRequestException('Please enter a valid name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) throw new BadRequestException('Please enter a valid email address.');
    if (!subject || subject.length > 160) throw new BadRequestException('Please choose a valid topic.');
    if (message.length < 5 || message.length > 8000) throw new BadRequestException('Please enter a message between 5 and 8000 characters.');

    return { fullName, email, subject, message };
  }
}
