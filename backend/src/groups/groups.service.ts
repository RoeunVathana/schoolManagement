import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityGroupInviteStatus, CommunityGroupRole, CommunityGroupVisibility, Role, UserStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media/media-storage.service';
import { CreateGroupDto } from './dto/create-group.dto';

const COMMUNITY_ROLES: Role[] = [Role.STUDENT, Role.CUSTOMER, Role.TEACHER];

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly media: MediaStorageService) {}

  private async ensureCommunityUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, role: true, status: true } });
    if (!user || user.status !== UserStatus.ACTIVE || !COMMUNITY_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only active community members can use groups');
    }
    return user;
  }

  private summary(group: any, userId: string) {
    const membership = group.members?.[0] || null;
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      coverImageUrl: group.coverImageUrl,
      visibility: group.visibility,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      owner: group.owner,
      memberCount: group._count?.members || 0,
      isMember: Boolean(membership),
      memberRole: membership?.role || null,
      isOwner: group.ownerId === userId,
      isLeader: group.ownerId === userId || membership?.role === CommunityGroupRole.ADMIN,
    };
  }

  private publicInvite(invite: any) {
    return {
      id: invite.id,
      groupId: invite.groupId,
      status: invite.status,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      group: invite.group ? {
        id: invite.group.id,
        name: invite.group.name,
        description: invite.group.description,
        visibility: invite.group.visibility,
      } : null,
      inviter: invite.inviter ? { id: invite.inviter.id, fullName: invite.inviter.fullName, role: invite.inviter.role, profileImageUrl: invite.inviter.profileImageUrl } : null,
      invitee: invite.invitee ? { id: invite.invitee.id, fullName: invite.invitee.fullName, role: invite.invitee.role, profileImageUrl: invite.invitee.profileImageUrl } : null,
    };
  }

  private async leaderGroup(groupId: string, userId: string) {
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, ownerId: true } });
    if (!group) throw new NotFoundException('Community group not found');
    if (group.ownerId === userId) return group;
    const membership = await this.prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { role: true } });
    if (membership?.role !== CommunityGroupRole.ADMIN) throw new ForbiddenException('Only a group leader can invite friends');
    return group;
  }

  private includeFor(userId: string) {
    return {
      owner: { select: { id: true, fullName: true, role: true, profileImageUrl: true } },
      _count: { select: { members: true } },
      members: { where: { userId }, select: { role: true }, take: 1 },
    } as const;
  }

  async list(userId: string) {
    await this.ensureCommunityUser(userId);
    const groups = await this.prisma.communityGroup.findMany({
      where: { OR: [{ visibility: CommunityGroupVisibility.PUBLIC }, { members: { some: { userId } } }] },
      include: this.includeFor(userId),
      orderBy: [{ createdAt: 'desc' }],
    });
    return groups.map((group) => this.summary(group, userId));
  }

  async get(groupId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const group = await this.prisma.communityGroup.findUnique({
      where: { id: groupId },
      include: {
        ...this.includeFor(userId),
        members: { include: { user: { select: { id: true, fullName: true, role: true, profileImageUrl: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!group) throw new NotFoundException('Community group not found');
    const isMember = group.members.some((member) => member.userId === userId);
    if (group.visibility === CommunityGroupVisibility.PRIVATE && !isMember) throw new NotFoundException('Community group not found');
    return { ...this.summary(group, userId), members: group.members.map((member) => ({ ...member.user, role: member.role, joinedAt: member.createdAt })) };
  }

  async create(userId: string, dto: CreateGroupDto) {
    await this.ensureCommunityUser(userId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Group name is required');
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityGroup.create({ data: { name, description: dto.description?.trim() || null, visibility: dto.visibility || CommunityGroupVisibility.PUBLIC, ownerId: userId } });
      await tx.communityGroupMember.create({ data: { groupId: created.id, userId, role: CommunityGroupRole.OWNER } });
      return created;
    });
    return this.get(group.id, userId);
  }

  async updateLogo(groupId: string, userId: string, file: Express.Multer.File) {
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true, coverImageUrl: true } });
    if (!group) throw new NotFoundException('Community group not found');
    await this.leaderGroup(groupId, userId);
    const uploaded = await this.media.upload(file, 'groups');
    const updated = await this.prisma.communityGroup.update({ where: { id: group.id }, data: { coverImageUrl: uploaded.url } });
    await this.media.remove(group.coverImageUrl);
    return this.get(updated.id, userId);
  }

  async removeLogo(groupId: string, userId: string) {
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true, coverImageUrl: true } });
    if (!group) throw new NotFoundException('Community group not found');
    await this.leaderGroup(groupId, userId);
    const updated = await this.prisma.communityGroup.update({ where: { id: groupId }, data: { coverImageUrl: null } });
    await this.media.remove(group.coverImageUrl);
    return this.get(updated.id, userId);
  }

  async join(groupId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, visibility: true } });
    if (!group || group.visibility !== CommunityGroupVisibility.PUBLIC) throw new NotFoundException('Public community group not found');
    await this.prisma.communityGroupMember.upsert({ where: { groupId_userId: { groupId, userId } }, update: {}, create: { groupId, userId } });
    return this.get(groupId, userId);
  }

  async listInvites(userId: string) {
    await this.ensureCommunityUser(userId);
    const [incoming, outgoing] = await Promise.all([
      this.prisma.communityGroupInvite.findMany({
        where: { inviteeId: userId, status: CommunityGroupInviteStatus.PENDING },
        include: {
          group: { select: { id: true, name: true, description: true, visibility: true } },
          inviter: { select: { id: true, fullName: true, role: true, profileImageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.communityGroupInvite.findMany({
        where: { inviterId: userId, status: CommunityGroupInviteStatus.PENDING },
        include: {
          group: { select: { id: true, name: true, description: true, visibility: true } },
          invitee: { select: { id: true, fullName: true, role: true, profileImageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { incoming: incoming.map((invite) => this.publicInvite(invite)), outgoing: outgoing.map((invite) => this.publicInvite(invite)) };
  }

  async invite(groupId: string, inviterId: string, inviteeId: string) {
    if (!inviteeId?.trim()) throw new BadRequestException('A friend is required');
    const inviter = await this.ensureCommunityUser(inviterId);
    const group = await this.leaderGroup(groupId, inviterId);
    if (inviterId === inviteeId) throw new BadRequestException('You cannot invite yourself');

    const [invitee, friendship, membership, pending] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: inviteeId }, select: { id: true, fullName: true, role: true, status: true, profileImageUrl: true } }),
      this.prisma.friendship.findFirst({ where: { OR: [{ userAId: inviterId, userBId: inviteeId }, { userAId: inviteeId, userBId: inviterId }] }, select: { id: true } }),
      this.prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: inviteeId } }, select: { id: true } }),
      this.prisma.communityGroupInvite.findFirst({ where: { groupId, inviteeId, status: CommunityGroupInviteStatus.PENDING }, select: { id: true } }),
    ]);
    if (!invitee || invitee.status !== UserStatus.ACTIVE || !COMMUNITY_ROLES.includes(invitee.role)) throw new BadRequestException('Only active community members can be invited');
    if (!friendship) throw new ForbiddenException('You can only invite accepted friends');
    if (membership) throw new ConflictException('This friend is already in the group');
    if (pending) throw new ConflictException('This friend has already been invited');

    let invite;
    try {
      invite = await this.prisma.communityGroupInvite.create({
        data: { groupId, inviterId, inviteeId, status: CommunityGroupInviteStatus.PENDING },
        include: {
          group: { select: { id: true, name: true, description: true, visibility: true } },
          inviter: { select: { id: true, fullName: true, role: true, profileImageUrl: true } },
          invitee: { select: { id: true, fullName: true, role: true, profileImageUrl: true } },
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('This friend has already been invited');
      throw error;
    }
    await this.notifications.createGroupInviteNotification(invitee.id, inviterId, `${inviter.fullName} invited you to join ${group.name}.`);
    return this.publicInvite(invite);
  }

  async acceptInvite(inviteId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const invite = await this.prisma.communityGroupInvite.findUnique({ where: { id: inviteId }, include: { group: { select: { id: true, name: true } } } });
    if (!invite || invite.inviteeId !== userId) throw new NotFoundException('Group invitation not found');
    if (invite.status !== CommunityGroupInviteStatus.PENDING) throw new BadRequestException('This group invitation is no longer pending');
    await this.prisma.$transaction(async (tx) => {
      await tx.communityGroupInvite.update({ where: { id: inviteId }, data: { status: CommunityGroupInviteStatus.ACCEPTED } });
      await tx.communityGroupMember.upsert({ where: { groupId_userId: { groupId: invite.groupId, userId } }, update: {}, create: { groupId: invite.groupId, userId, role: CommunityGroupRole.MEMBER } });
    });
    return this.get(invite.groupId, userId);
  }

  async declineInvite(inviteId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const invite = await this.prisma.communityGroupInvite.findUnique({ where: { id: inviteId }, select: { id: true, inviteeId: true, status: true } });
    if (!invite || invite.inviteeId !== userId) throw new NotFoundException('Group invitation not found');
    if (invite.status !== CommunityGroupInviteStatus.PENDING) throw new BadRequestException('This group invitation is no longer pending');
    return this.prisma.communityGroupInvite.update({ where: { id: inviteId }, data: { status: CommunityGroupInviteStatus.DECLINED } });
  }

  async cancelInvite(groupId: string, inviteId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    await this.leaderGroup(groupId, userId);
    const invite = await this.prisma.communityGroupInvite.findUnique({ where: { id: inviteId }, select: { id: true, groupId: true, status: true } });
    if (!invite || invite.groupId !== groupId) throw new NotFoundException('Group invitation not found');
    if (invite.status !== CommunityGroupInviteStatus.PENDING) throw new BadRequestException('This group invitation is no longer pending');
    return this.prisma.communityGroupInvite.update({ where: { id: inviteId }, data: { status: CommunityGroupInviteStatus.CANCELLED } });
  }

  async leave(groupId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const membership = await this.prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { id: true, role: true } });
    if (!membership) throw new NotFoundException('You are not a member of this group');
    if (membership.role === CommunityGroupRole.OWNER) throw new BadRequestException('The group owner cannot leave the group. Delete the group instead.');
    await this.prisma.communityGroupMember.delete({ where: { id: membership.id } });
    return { message: 'You left the group' };
  }

  async remove(groupId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true } });
    if (!group) throw new NotFoundException('Community group not found');
    if (group.ownerId !== userId) throw new ForbiddenException('Only the group owner can delete this group');
    await this.prisma.communityGroup.delete({ where: { id: groupId } });
    return { message: 'Group deleted' };
  }
}
