import { BadRequestException, Body, Controller, ForbiddenException, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  language: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
} as const;

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class AdminRoleController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('role-by-email')
  async assignAdminByEmail(
    @Body() body: { email?: string; role?: string },
    @CurrentUser() actor: { id: string },
  ) {
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) throw new BadRequestException('A user email is required.');
    if (body?.role && body.role !== Role.ADMIN) {
      throw new BadRequestException('This action can only assign the ADMIN role.');
    }

    const target = await this.prisma.user.findUnique({ where: { email }, select: userSelect });
    if (!target) throw new BadRequestException('No user was found with that email.');
    if (target.id === actor.id) {
      throw new BadRequestException('Choose another user. You cannot assign the admin role to yourself.');
    }
    if (target.role === Role.OWNER) {
      throw new ForbiddenException('The system owner role cannot be changed here.');
    }
    if (target.role === Role.ADMIN) return this.normalize(target);

    const user = await this.prisma.user.update({
      where: { id: target.id },
      data: { role: Role.ADMIN, canCreate: true, canEdit: true, canDelete: true },
      select: userSelect,
    });
    return this.normalize(user);
  }

  private normalize<T extends { role?: Role; canCreate?: boolean; canEdit?: boolean; canDelete?: boolean }>(user: T) {
    return user.role === Role.ADMIN ? { ...user, canCreate: true, canEdit: true, canDelete: true } : user;
  }
}
