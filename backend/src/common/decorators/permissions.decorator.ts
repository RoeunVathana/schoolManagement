import { SetMetadata } from '@nestjs/common';

export type Permission = 'create' | 'edit' | 'delete';
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
