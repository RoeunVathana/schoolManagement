import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageReactionType, Role, UserStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const userSelect = { id: true, fullName: true, role: true, profileImageUrl: true, profile: { select: { avatar: true, username: true } } } as const;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private pair(first: string, second: string) {
    return first < second ? [first, second] as const : [second, first] as const;
  }

  private async assertMember(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== UserStatus.ACTIVE || !(user.role === Role.STUDENT || user.role === Role.CUSTOMER)) throw new ForbiddenException('Only active students and customers can use chat');
    return user;
  }

  private async assertFriends(firstId: string, secondId: string) {
    if (firstId === secondId) throw new BadRequestException('You cannot start a chat with yourself');
    await Promise.all([this.assertMember(firstId), this.assertMember(secondId)]);
    const [userAId, userBId] = this.pair(firstId, secondId);
    const blocked = await this.prisma.userBlock.findFirst({ where: { OR: [{ blockerId: firstId, blockedId: secondId }, { blockerId: secondId, blockedId: firstId }] }, select: { id: true } });
    if (blocked) throw new ForbiddenException('Blocked users cannot chat');
    const friendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (!friendship) throw new ForbiddenException('You can chat after the friend request is accepted');
    return { userAId, userBId };
  }

  private async getConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private async assertParticipant(conversationId: string, userId: string) {
    await this.assertMember(userId);
    const conversation = await this.getConversation(conversationId);
    if (conversation.userAId !== userId && conversation.userBId !== userId) throw new ForbiddenException('You cannot access this conversation');
    await this.assertFriends(conversation.userAId, conversation.userBId);
    return conversation;
  }

  private async present(conversationId: string, viewerId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        userA: { select: userSelect },
        userB: { select: userSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, fullName: true } } } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const otherUser = conversation.userAId === viewerId ? conversation.userB : conversation.userA;
    return { id: conversation.id, otherUser, lastMessage: conversation.messages[0] || null, updatedAt: conversation.updatedAt };
  }

  async openWith(userId: string, friendId: string) {
    const { userAId, userBId } = await this.assertFriends(userId, friendId);
    const conversation = await this.prisma.conversation.upsert({ where: { userAId_userBId: { userAId, userBId } }, update: {}, create: { userAId, userBId } });
    return this.present(conversation.id, userId);
  }

  async listConversations(userId: string) {
    await this.assertMember(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(conversations.map((conversation) => this.present(conversation.id, userId)));
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertParticipant(conversationId, userId);
    const messages = await this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 200, include: { sender: { select: userSelect }, reactions: { select: { userId: true, type: true } } } });
    return messages.map((message) => this.presentMessage(message, userId));
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const conversation = await this.assertParticipant(conversationId, userId);
    const messageBody = body.trim();
    if (!messageBody) throw new BadRequestException('Message cannot be empty');
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { conversationId, senderId: userId, body: messageBody }, include: { sender: { select: userSelect } } });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });
    const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    await this.notifications.createMessageNotification(recipientId, userId, messageBody);
    return this.presentMessage({ ...message, reactions: [] }, userId);
  }

  async sendImage(userId: string, conversationId: string, file: Express.Multer.File, body = '') {
    const conversation = await this.assertParticipant(conversationId, userId);
    const messageBody = body.trim();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: userId, body: messageBody, imageUrl: `/uploads/chat/${file.filename}` },
        include: { sender: { select: userSelect } },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });
    const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    await this.notifications.createMessageNotification(recipientId, userId, messageBody || 'Sent you an image.');
    return this.presentMessage({ ...message, reactions: [] }, userId);
  }

  private presentMessage(message: any, viewerId: string) {
    const reactionCounts = (message.reactions || []).reduce((counts: Record<string, number>, reaction: { type: MessageReactionType }) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});
    const reactionCount = Object.keys(reactionCounts).reduce((total, type) => total + reactionCounts[type], 0);
    return { ...message, reactions: reactionCounts, reactionCount, myReaction: (message.reactions || []).find((reaction: { userId: string }) => reaction.userId === viewerId)?.type || null };
  }

  private async assertMessageParticipant(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId }, select: { id: true, conversationId: true } });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertParticipant(message.conversationId, userId);
    return message;
  }

  async reactMessage(userId: string, messageId: string, type: MessageReactionType) {
    await this.assertMessageParticipant(userId, messageId);
    const reaction = await this.prisma.messageReaction.upsert({ where: { messageId_userId: { messageId, userId } }, update: { type }, create: { messageId, userId, type } });
    return { messageId, type: reaction.type };
  }

  async removeReaction(userId: string, messageId: string) {
    await this.assertMessageParticipant(userId, messageId);
    await this.prisma.messageReaction.deleteMany({ where: { messageId, userId } });
    return { messageId, type: null };
  }

  async markRead(userId: string, conversationId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { readAt: new Date() } });
    return { message: 'Conversation marked as read' };
  }
}
