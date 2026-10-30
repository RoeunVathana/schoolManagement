import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const user = context.switchToHttp().getRequest().user;
    if (roles?.length && (!user || !roles.includes(user.role))) return false;
    const permissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!permissions?.length || user?.role === Role.ADMIN || user?.role === Role.OWNER) return true;
    const permissionMap: Record<Permission, string> = { create: 'canCreate', edit: 'canEdit', delete: 'canDelete' };
    return !!user && permissions.every((permission) => user[permissionMap[permission]] === true);
  }
}
