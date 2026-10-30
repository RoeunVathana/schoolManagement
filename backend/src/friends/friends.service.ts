import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FriendRequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../auth/mail.service';

const COMMUNITY_ROLES = [Role.STUDENT, Role.CUSTOMER];

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly mail: MailService) {}

  private pair(first: string, second: string) {
    return first < second ? [first, second] as const : [second, first] as const;
  }

  private async member(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true, email: true, role: true, status: true, profileImageUrl: true, profile: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE' || !COMMUNITY_ROLES.some((role) => role === user.role)) throw new BadRequestException('Only active students and customers can use the friend system');
    return user;
  }

  private async blocked(firstId: string, secondId: string) {
    return this.prisma.userBlock.findFirst({ where: { OR: [{ blockerId: firstId, blockedId: secondId }, { blockerId: secondId, blockedId: firstId }] }, select: { id: true } });
  }

  async friendshipStatus(viewerId: string, targetId: string) {
    if (viewerId === targetId) return 'SELF' as const;
    const [userAId, userBId] = this.pair(viewerId, targetId);
    const friendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (friendship) return 'FRIENDS' as const;
    const request = await this.prisma.friendRequest.findFirst({ where: { status: FriendRequestStatus.PENDING, OR: [{ senderId: viewerId, receiverId: targetId }, { senderId: targetId, receiverId: viewerId }] }, orderBy: { createdAt: 'desc' }, select: { senderId: true } });
    if (!request) return 'NONE' as const;
    return request.senderId === viewerId ? 'REQUEST_SENT' as const : 'REQUEST_RECEIVED' as const;
  }

  async relationship(viewerId: string, targetId: string) {
    const status = await this.friendshipStatus(viewerId, targetId);
    if (status === 'SELF' || status === 'NONE' || status === 'FRIENDS') return { status, requestId: null };
    const request = await this.prisma.friendRequest.findFirst({ where: { status: FriendRequestStatus.PENDING, OR: [{ senderId: viewerId, receiverId: targetId }, { senderId: targetId, receiverId: viewerId }] }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    return { status, requestId: request?.id || null };
  }

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new BadRequestException('You cannot send a friend request to yourself');
    const [sender, receiver] = await Promise.all([this.member(senderId), this.member(receiverId)]);
    if (await this.blocked(senderId, receiverId)) throw new ForbiddenException('Blocked users cannot send friend requests');
    const [userAId, userBId] = this.pair(senderId, receiverId);
    const [friendship, pending] = await Promise.all([
      this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } }),
      this.prisma.friendRequest.findFirst({ where: { status: FriendRequestStatus.PENDING, OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] }, select: { id: true } }),
    ]);
    if (friendship) throw new ConflictException('You are already friends');
    if (pending) throw new ConflictException('A pending friend request already exists');
    const requestKey = [userAId, userBId].join(':');
    let request;
    try {
      request = await this.prisma.friendRequest.create({ data: { senderId, receiverId, requestKey, status: FriendRequestStatus.PENDING }, include: { sender: { select: { id: true, fullName: true, profileImageUrl: true } }, receiver: { select: { id: true, fullName: true } } } });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') throw new ConflictException('A pending friend request already exists');
      throw error;
    }
    await this.notifications.createFriendRequestNotification(receiver.id, sender.id, `${sender.fullName} sent you a friend request.`);
    await this.mail.sendFriendRequestNotification(receiver.email, receiver.fullName, sender.fullName).catch(() => false);
    return request;
  }

  async acceptRequest(requestId: string, receiverId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId }, include: { sender: { select: { id: true, fullName: true, email: true } }, receiver: { select: { id: true, fullName: true, email: true } } } });
    if (!request || request.receiverId !== receiverId) throw new NotFoundException('Friend request not found');
    const [userAId, userBId] = this.pair(request.senderId, request.receiverId);
    const existingFriendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (existingFriendship) {
      if (request.status !== FriendRequestStatus.ACCEPTED) {
        await this.prisma.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.ACCEPTED } });
      }
      return { ...request, status: FriendRequestStatus.ACCEPTED };
    }
    if (request.status === FriendRequestStatus.ACCEPTED) {
      await this.prisma.friendship.upsert({ where: { userAId_userBId: { userAId, userBId } }, update: {}, create: { userAId, userBId } });
      return request;
    }
    if (request.status !== FriendRequestStatus.PENDING) throw new BadRequestException('This friend request is no longer pending');
    const accepted = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.ACCEPTED } });
      await tx.friendRequest.updateMany({ where: { id: { not: requestId }, status: FriendRequestStatus.PENDING, OR: [{ senderId: request.senderId, receiverId: request.receiverId }, { senderId: request.receiverId, receiverId: request.senderId }] }, data: { status: FriendRequestStatus.CANCELLED } });
      await tx.friendship.upsert({ where: { userAId_userBId: { userAId, userBId } }, update: {}, create: { userAId, userBId } });
      return updated;
    });
    await this.notifications.createFriendRequestAcceptedNotification(request.senderId, receiverId, `${request.receiver.fullName} accepted your friend request.`);
    await this.mail.sendFriendRequestAcceptedNotification(request.sender.email, request.sender.fullName, request.receiver.fullName).catch(() => false);
    return accepted;
  }

  async rejectRequest(requestId: string, receiverId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId }, select: { id: true, receiverId: true, status: true } });
    if (!request || request.receiverId !== receiverId) throw new NotFoundException('Friend request not found');
    if (request.status !== FriendRequestStatus.PENDING) throw new BadRequestException('This friend request is no longer pending');
    return this.prisma.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.REJECTED } });
  }

  async cancelRequest(requestId: string, senderId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId }, select: { id: true, senderId: true, status: true } });
    if (!request || request.senderId !== senderId) throw new NotFoundException('Friend request not found');
    if (request.status !== FriendRequestStatus.PENDING) throw new BadRequestException('This friend request is no longer pending');
    return this.prisma.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.CANCELLED } });
  }

  async unfriend(userId: string, friendId: string) {
    if (userId === friendId) throw new BadRequestException('You cannot unfriend yourself');
    const [userAId, userBId] = this.pair(userId, friendId);
    const friendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (!friendship) throw new NotFoundException('Friendship not found');
    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { message: 'Friendship removed' };
  }

  private publicUser(user: any) {
    return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, profileImageUrl: user.profileImageUrl, profile: user.profile || null };
  }

  private publicRequest(request: any, direction: 'incoming' | 'outgoing') {
    const person = direction === 'incoming' ? request.sender : request.receiver;
    return { id: request.id, senderId: request.senderId, receiverId: request.receiverId, status: request.status, createdAt: request.createdAt, updatedAt: request.updatedAt, user: this.publicUser(person) };
  }

  async listFriends(userId: string) {
    await this.member(userId);
    const friendships = await this.prisma.friendship.findMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] }, include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } }, orderBy: { createdAt: 'desc' } });
    return friendships.map((friendship) => this.publicUser(friendship.userAId === userId ? friendship.userB : friendship.userA));
  }

  async listRequests(userId: string) {
    await this.member(userId);
    const [incoming, outgoing] = await Promise.all([
      this.prisma.friendRequest.findMany({ where: { receiverId: userId, status: FriendRequestStatus.PENDING }, include: { sender: { include: { profile: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.friendRequest.findMany({ where: { senderId: userId, status: FriendRequestStatus.PENDING }, include: { receiver: { include: { profile: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { incoming: incoming.map((request) => this.publicRequest(request, 'incoming')), outgoing: outgoing.map((request) => this.publicRequest(request, 'outgoing')) };
  }

  async search(userId: string, query: string) {
    await this.member(userId);
    const term = query.trim();
    if (term.length < 2) return [];

    const blocked = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excludedIds = new Set([userId]);
    blocked.forEach((block) => { excludedIds.add(block.blockerId); excludedIds.add(block.blockedId); });

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excludedIds] },
        role: { in: COMMUNITY_ROLES },
        status: 'ACTIVE',
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: { profile: true },
      orderBy: { fullName: 'asc' },
      take: 20,
    });

    return Promise.all(users.map(async (user) => {
      const relationship = await this.relationship(userId, user.id);
      return { ...this.publicUser(user), friendshipStatus: relationship.status, friendRequestId: relationship.requestId };
    }));
  }

  async suggestions(userId: string) {
    const friends = await this.listFriends(userId);
    const excludedIds = new Set([userId, ...friends.map((friend) => friend.id)]);
    const pending = await this.prisma.friendRequest.findMany({ where: { status: FriendRequestStatus.PENDING, OR: [{ senderId: userId }, { receiverId: userId }] }, select: { senderId: true, receiverId: true } });
    pending.forEach((request) => { excludedIds.add(request.senderId); excludedIds.add(request.receiverId); });
    const blocked = await this.prisma.userBlock.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    blocked.forEach((block) => { excludedIds.add(block.blockerId); excludedIds.add(block.blockedId); });
    const users = await this.prisma.user.findMany({ where: { id: { notIn: [...excludedIds] }, role: { in: COMMUNITY_ROLES }, status: 'ACTIVE' }, include: { profile: true }, orderBy: { createdAt: 'desc' }, take: 12 });
    return users.map((user) => this.publicUser(user));
  }
}
