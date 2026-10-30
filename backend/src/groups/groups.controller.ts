import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupInviteDto } from './dto/group-invite.dto';
import { GroupsService } from './groups.service';
import { groupImageUpload } from '../common/upload.options';

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

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateGroupDto) { return this.groups.update(id, user.id, dto); }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo', groupImageUpload))
  logo(@Param('id') id: string, @CurrentUser() user: { id: string }, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Please select a PNG, JPG, JPEG or WEBP group logo.');
    return this.groups.updateLogo(id, user.id, file);
  }

  @Delete(':id/logo')
  removeLogo(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.groups.removeLogo(id, user.id); }

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
