import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { pagination, paginationResult } from '../common/pagination';
import { assertStrongPassword } from '../common/password';
import * as bcrypt from 'bcrypt';

@ApiTags('users') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  private normalizePermissions<T extends { role?: Role; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }>(user: T) {
    return user.role === Role.ADMIN ? { ...user, canCreate: true, canEdit: true, canDelete: true } : user;
  }

  @Get() async list(@Query() q: any) { const { page, limit, skip } = pagination(q.page, q.limit); const where: any = q.search ? { OR: [{ fullName: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] } : {}; const [data, total] = await Promise.all([this.prisma.user.findMany({ where, skip, take: limit, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true, lastSeenAt: true, createdAt: true } }), this.prisma.user.count({ where })]); return paginationResult(data.map((user) => this.normalizePermissions({ ...user, isOnline: !!user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() <= 90_000 })), total, page, limit); }
  @Get(':id') async get(@Param('id') id: string) { const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true, lastSeenAt: true, createdAt: true, updatedAt: true } }); return this.normalizePermissions({ ...user, isOnline: !!user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() <= 90_000 }); }
  @Post() async create(@Body() body: any) {
    const password = body?.password;
    if (!password) throw new BadRequestException('A password is required when creating a user.');
    assertStrongPassword(password);
    const role = Object.values(Role).includes(body?.role) ? body.role : Role.STUDENT;
    const data = {
      fullName: String(body?.fullName || '').trim(),
      email: String(body?.email || '').trim().toLowerCase(),
      phone: body?.phone,
      role,
      status: Object.values(UserStatus).includes(body?.status) ? body.status : UserStatus.ACTIVE,
      language: body?.language === 'km' ? 'km' : 'en',
      password: await bcrypt.hash(password, 12),
      ...(role === Role.ADMIN ? { canCreate: true, canEdit: true, canDelete: true } : {}),
    };
    if (!data.fullName || !data.email) throw new BadRequestException('Full name and email are required.');
    const user = await this.prisma.user.create({ data, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true } });
    return this.normalizePermissions(user);
  }
  @Patch(':id') async update(@Param('id') id: string, @Body() body: any) {
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { role: true } });
    const data: any = {};
    for (const key of ['fullName', 'phone']) if (body?.[key] !== undefined) data[key] = body[key];
    if (body?.email !== undefined) data.email = String(body.email).trim().toLowerCase();
    if (body?.language !== undefined) data.language = body.language === 'km' ? 'km' : 'en';
    if (body?.role !== undefined) {
      if (!Object.values(Role).includes(body.role)) throw new BadRequestException('Invalid user role.');
      data.role = body.role;
    }
    if (body?.status !== undefined) {
      if (!Object.values(UserStatus).includes(body.status)) throw new BadRequestException('Invalid user status.');
      data.status = body.status;
    }
    for (const key of ['canCreate', 'canEdit', 'canDelete']) if (typeof body?.[key] === 'boolean') data[key] = body[key];
    if (body?.password !== undefined) {
      assertStrongPassword(body.password);
      data.password = await bcrypt.hash(body.password, 12);
    }
    if ((data.role ?? current.role) === Role.ADMIN) Object.assign(data, { canCreate: true, canEdit: true, canDelete: true });
    const user = await this.prisma.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true } });
    return this.normalizePermissions(user);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.prisma.user.delete({ where: { id }, select: { id: true } }); }
}
