import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupInviteDto } from './dto/group-invite.dto';
import { GroupsService } from './groups.service';

@ApiTags('community-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) { return this.groups.list(user.id); }

  @Get('invites')
  invites(@CurrentUser() user: { id: string }) { return this.groups.listInvites(user.id); }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.groups.get(id, user.id); }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateGroupDto) { return this.groups.create(user.id, dto); }

  @Post(':id/join')
  join(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.groups.join(id, user.id); }

  @Post(':id/invites')
  invite(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: GroupInviteDto) { return this.groups.invite(id, user.id, dto.inviteeId); }

  @Patch('invites/:inviteId/accept')
  acceptInvite(@Param('inviteId') inviteId: string, @CurrentUser() user: { id: string }) { return this.groups.acceptInvite(inviteId, user.id); }

  @Patch('invites/:inviteId/decline')
  declineInvite(@Param('inviteId') inviteId: string, @CurrentUser() user: { id: string }) { return this.groups.declineInvite(inviteId, user.id); }

  @Delete(':id/invites/:inviteId')
  cancelInvite(@Param('id') id: string, @Param('inviteId') inviteId: string, @CurrentUser() user: { id: string }) { return this.groups.cancelInvite(id, inviteId, user.id); }

  @Delete(':id/leave')
  leave(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.groups.leave(id, user.id); }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.groups.remove(id, user.id); }
}
