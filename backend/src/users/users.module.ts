import { Module } from '@nestjs/common';
import { AdminRoleController } from './admin-role.controller';
import { UsersController } from './users.controller';

@Module({ controllers: [AdminRoleController, UsersController] })
export class UsersModule {}
