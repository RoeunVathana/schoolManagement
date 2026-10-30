import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityGroupRole, CommunityGroupVisibility, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

const COMMUNITY_ROLES: Role[] = [Role.STUDENT, Role.CUSTOMER, Role.TEACHER];

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCommunityUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
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
    };
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

  async join(groupId: string, userId: string) {
    await this.ensureCommunityUser(userId);
    const group = await this.prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, visibility: true } });
    if (!group || group.visibility !== CommunityGroupVisibility.PUBLIC) throw new NotFoundException('Public community group not found');
    await this.prisma.communityGroupMember.upsert({ where: { groupId_userId: { groupId, userId } }, update: {}, create: { groupId, userId } });
    return this.get(groupId, userId);
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
