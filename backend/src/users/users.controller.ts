import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { pagination, paginationResult } from '../common/pagination';
import * as bcrypt from 'bcrypt';

@ApiTags('users') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  private normalizePermissions<T extends { role?: Role; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }>(user: T) {
    return user.role === Role.ADMIN ? { ...user, canCreate: true, canEdit: true, canDelete: true } : user;
  }

  @Get() async list(@Query() q: any) { const { page, limit, skip } = pagination(q.page, q.limit); const where: any = q.search ? { OR: [{ fullName: { contains: q.search, mode: 'insensitive' } }, { email: { contains: q.search, mode: 'insensitive' } }] } : {}; const [data, total] = await Promise.all([this.prisma.user.findMany({ where, skip, take: limit, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true, createdAt: true } }), this.prisma.user.count({ where })]); return paginationResult(data.map((user) => this.normalizePermissions(user)), total, page, limit); }
  @Get(':id') async get(@Param('id') id: string) { const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true, createdAt: true, updatedAt: true } }); return this.normalizePermissions(user); }
  @Post() async create(@Body() body: any) { const { password, ...data } = body; const permissions = data.role === Role.ADMIN ? { canCreate: true, canEdit: true, canDelete: true } : {}; const user = await this.prisma.user.create({ data: { ...data, ...permissions, language: data.language === 'km' ? 'km' : 'en', password: await bcrypt.hash(password ?? 'ChangeMe123!', 12) }, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true } }); return this.normalizePermissions(user); }
  @Patch(':id') async update(@Param('id') id: string, @Body() body: any) { const current = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { role: true } }); const data: any = { ...body }; if (data.password) data.password = await bcrypt.hash(data.password, 12); if (data.language) data.language = data.language === 'km' ? 'km' : 'en'; if ((data.role ?? current.role) === Role.ADMIN) Object.assign(data, { canCreate: true, canEdit: true, canDelete: true }); const user = await this.prisma.user.update({ where: { id }, data, select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, language: true, canCreate: true, canEdit: true, canDelete: true } }); return this.normalizePermissions(user); }
  @Delete(':id') remove(@Param('id') id: string) { return this.prisma.user.delete({ where: { id }, select: { id: true } }); }
}
