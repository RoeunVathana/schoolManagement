import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityGroupVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const personSelect = { id: true, fullName: true, email: true, role: true, profileImageUrl: true } as const;

@Injectable()
export class CommunityAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listGroups() {
    return this.prisma.communityGroup.findMany({
      take: 200,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: personSelect },
        members: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: personSelect } },
        },
        _count: { select: { members: true, invites: true } },
      },
    });
  }

  async updateGroup(id: string, body: { name?: string; description?: string | null; visibility?: CommunityGroupVisibility }) {
    const current = await this.prisma.communityGroup.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Group not found.');

    const data: Prisma.CommunityGroupUpdateInput = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 80) throw new BadRequestException('Group name must be between 2 and 80 characters.');
      data.name = name;
    }
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim().slice(0, 2000) : null;
    if (body.visibility !== undefined) {
      if (!Object.values(CommunityGroupVisibility).includes(body.visibility)) throw new BadRequestException('Invalid group visibility.');
      data.visibility = body.visibility;
    }
    if (!Object.keys(data).length) throw new BadRequestException('No group changes were provided.');
    return this.prisma.communityGroup.update({ where: { id }, data, include: { owner: { select: personSelect }, _count: { select: { members: true } } } });
  }

  async removeGroup(id: string) {
    const current = await this.prisma.communityGroup.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Group not found.');
    return this.prisma.communityGroup.delete({ where: { id }, select: { id: true } });
  }

  async removeGroupMember(groupId: string, userId: string) {
    const membership = await this.prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, include: { group: { select: { ownerId: true } } } });
    if (!membership) throw new NotFoundException('Group member not found.');
    if (membership.group.ownerId === userId) throw new BadRequestException('The group owner cannot be removed. Delete or transfer the group instead.');
    await this.prisma.communityGroupMember.delete({ where: { id: membership.id } });
    return { id: membership.id, removed: true };
  }

  listFriendships() {
    return this.prisma.friendship.findMany({
      take: 300,
      orderBy: { createdAt: 'desc' },
      include: { userA: { select: personSelect }, userB: { select: personSelect } },
    });
  }

  listFriendRequests() {
    return this.prisma.friendRequest.findMany({
      take: 300,
      orderBy: { updatedAt: 'desc' },
      include: { sender: { select: personSelect }, receiver: { select: personSelect } },
    });
  }

  async removeFriendship(id: string) {
    const current = await this.prisma.friendship.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Friendship not found.');
    return this.prisma.friendship.delete({ where: { id }, select: { id: true } });
  }

  async removeFriendRequest(id: string) {
    const current = await this.prisma.friendRequest.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Friend request not found.');
    return this.prisma.friendRequest.delete({ where: { id }, select: { id: true } });
  }

  listConversations() {
    return this.prisma.conversation.findMany({
      take: 300,
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: personSelect },
        userB: { select: personSelect },
        group: { select: { id: true, name: true, visibility: true } },
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { body: true, createdAt: true, deletedAt: true, sender: { select: personSelect } },
        },
      },
    });
  }

  async listMessages(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    if (!conversation) throw new NotFoundException('Conversation not found.');
    return this.prisma.message.findMany({
      where: { conversationId },
      take: 500,
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: personSelect }, reactions: { include: { user: { select: personSelect } } } },
    });
  }

  async removeMessage(id: string) {
    const message = await this.prisma.message.findUnique({ where: { id }, select: { id: true } });
    if (!message) throw new NotFoundException('Message not found.');
    return this.prisma.message.update({
      where: { id },
      data: { body: '[Message removed by administrator]', imageUrl: null, mediaType: null, deletedAt: new Date(), editedAt: null },
      select: { id: true, deletedAt: true },
    });
  }
}
