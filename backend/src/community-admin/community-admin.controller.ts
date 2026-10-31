import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunityGroupVisibility, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommunityAdminService } from './community-admin.service';

@ApiTags('admin-community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/community')
export class CommunityAdminController {
  constructor(private readonly community: CommunityAdminService) {}

  @Get('groups') groups() { return this.community.listGroups(); }
  @Patch('groups/:id') updateGroup(@Param('id') id: string, @Body() body: { name?: string; description?: string | null; visibility?: CommunityGroupVisibility }) { return this.community.updateGroup(id, body); }
  @Delete('groups/:id') removeGroup(@Param('id') id: string) { return this.community.removeGroup(id); }
  @Delete('groups/:groupId/members/:userId') removeMember(@Param('groupId') groupId: string, @Param('userId') userId: string) { return this.community.removeGroupMember(groupId, userId); }

  @Get('friendships') friendships() { return this.community.listFriendships(); }
  @Delete('friendships/:id') removeFriendship(@Param('id') id: string) { return this.community.removeFriendship(id); }
  @Get('requests') requests() { return this.community.listFriendRequests(); }
  @Delete('requests/:id') removeRequest(@Param('id') id: string) { return this.community.removeFriendRequest(id); }

  @Get('conversations') conversations() { return this.community.listConversations(); }
  @Get('conversations/:id/messages') messages(@Param('id') id: string) { return this.community.listMessages(id); }
  @Delete('messages/:id') removeMessage(@Param('id') id: string) { return this.community.removeMessage(id); }
}
