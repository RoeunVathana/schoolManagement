import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TelegramService } from './telegram.service';

@ApiTags('telegram-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('telegram-settings')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get()
  getSettings() { return this.telegram.publicSettings(); }

  @Patch()
  @Permissions('edit')
  saveSettings(@Body() body: { botToken?: string; chatId?: string; enabled?: boolean }, @CurrentUser() _user: any) { return this.telegram.saveSettings(body); }

  @Post('test')
  @Permissions('edit')
  test() { return this.telegram.sendTestMessage(); }

  @Post('group-invite')
  @Permissions('create')
  sendGroupInvite(@Body() body: { courseId?: string; inviteLink?: string; audience?: 'ALL' | 'TEACHERS' | 'STUDENTS'; message?: string }, @CurrentUser() user: { id: string }) { return this.telegram.sendGroupInvite(user.id, body); }
}
