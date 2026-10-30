import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, MessageReactionType, Role, UserStatus } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media/media-storage.service';
import { isLearnerRole } from '../common/learner-roles';

const userSelect = { id: true, fullName: true, role: true, profileImageUrl: true, lastSeenAt: true, profile: { select: { avatar: true, username: true } } } as const;
const DIRECT_CHAT_ROLES: Role[] = [Role.STUDENT, Role.CUSTOMER, Role.TEACHER];

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly media: MediaStorageService) {}

  private pair(first: string, second: string) {
    return first < second ? [first, second] as const : [second, first] as const;
  }

  private async assertMember(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== UserStatus.ACTIVE || !DIRECT_CHAT_ROLES.includes(user.role)) throw new ForbiddenException('Only active teachers, students and customers can use chat');
    return user;
  }

  private async assertDirectChat(firstId: string, secondId: string) {
    if (firstId === secondId) throw new BadRequestException('You cannot start a chat with yourself');
    const [firstUser, secondUser] = await Promise.all([this.assertMember(firstId), this.assertMember(secondId)]);
    const [userAId, userBId] = this.pair(firstId, secondId);
    const blocked = await this.prisma.userBlock.findFirst({ where: { OR: [{ blockerId: firstId, blockedId: secondId }, { blockerId: secondId, blockedId: firstId }] }, select: { id: true } });
    if (blocked) throw new ForbiddenException('Blocked users cannot chat');
    const friendship = await this.prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } }, select: { id: true } });
    if (friendship) return { userAId, userBId };

    const teacherUserId = firstUser.role === Role.TEACHER ? firstId : secondUser.role === Role.TEACHER ? secondId : null;
    const studentUserId = isLearnerRole(firstUser.role) ? firstId : isLearnerRole(secondUser.role) ? secondId : null;
    if (teacherUserId && studentUserId) {
      const activeEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          status: 'ACTIVE',
          student: { userId: studentUserId },
          course: { teacher: { userId: teacherUserId } },
        },
        select: { id: true },
      });
      if (activeEnrollment) return { userAId, userBId };
    }

    throw new ForbiddenException('Teachers can chat with students enrolled in their courses. Other users must be accepted friends.');
  }

  private async getConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private async assertGroupMember(groupId: string, userId: string) {
    const [user, membership] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } }),
      this.prisma.communityGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { id: true } }),
    ]);
    if (!user || user.status !== UserStatus.ACTIVE || !([Role.STUDENT, Role.CUSTOMER, Role.TEACHER] as Role[]).includes(user.role)) throw new ForbiddenException('Only active community members can use group chat');
    if (!membership) throw new ForbiddenException('Only group members can access this group chat');
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.getConversation(conversationId);
    if (conversation.groupId) {
      await this.assertGroupMember(conversation.groupId, userId);
      return conversation;
    }
    await this.assertMember(userId);
    if (!conversation.userAId || !conversation.userBId) throw new ForbiddenException('This conversation is not configured correctly');
    if (conversation.userAId !== userId && conversation.userBId !== userId) throw new ForbiddenException('You cannot access this conversation');
    await this.assertDirectChat(conversation.userAId, conversation.userBId);
    return conversation;
  }

  private async present(conversationId: string, viewerId: string) {
    const [conversation, unreadCount] = await Promise.all([
      this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          userA: { select: userSelect },
          userB: { select: userSelect },
          group: { select: { id: true, name: true, description: true, coverImageUrl: true, visibility: true, _count: { select: { members: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, fullName: true } } } },
        },
      }),
      this.prisma.message.count({ where: { conversationId, senderId: { not: viewerId }, readAt: null } }),
    ]);
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.groupId) {
      const group = conversation.group ? { ...conversation.group, memberCount: conversation.group._count.members } : null;
      return { id: conversation.id, isGroup: true, group, otherUser: null, lastMessage: conversation.messages[0] || null, unreadCount, updatedAt: conversation.updatedAt };
    }
    const otherUser = conversation.userAId === viewerId ? conversation.userB : conversation.userA;
    const otherUserWithPresence = otherUser ? { ...otherUser, isOnline: !!otherUser.lastSeenAt && Date.now() - new Date(otherUser.lastSeenAt).getTime() <= 90_000 } : null;
    return { id: conversation.id, isGroup: false, group: null, otherUser: otherUserWithPresence, lastMessage: conversation.messages[0] || null, unreadCount, updatedAt: conversation.updatedAt };
  }

  async openWith(userId: string, friendId: string) {
    const { userAId, userBId } = await this.assertDirectChat(userId, friendId);
    const conversation = await this.prisma.conversation.upsert({ where: { userAId_userBId: { userAId, userBId } }, update: {}, create: { userAId, userBId } });
    return this.present(conversation.id, userId);
  }

  async listContacts(userId: string) {
    const user = await this.assertMember(userId);
    if (user.role !== Role.TEACHER && !isLearnerRole(user.role)) return [];

    const contacts = user.role === Role.TEACHER
      ? (await this.prisma.enrollment.findMany({
        where: { status: 'ACTIVE', course: { teacher: { userId } } },
        select: { student: { select: { user: { select: userSelect } } } },
      })).map((enrollment) => enrollment.student.user)
      : (await this.prisma.enrollment.findMany({
        where: { status: 'ACTIVE', student: { userId } },
        select: { course: { select: { teacher: { select: { user: { select: userSelect } } } } } },
      })).map((enrollment) => enrollment.course.teacher.user);

    const uniqueContacts = [...new Map(contacts.map((contact) => [contact.id, contact])).values()];
    return uniqueContacts.map((contact) => ({
      ...contact,
      isOnline: !!contact.lastSeenAt && Date.now() - new Date(contact.lastSeenAt).getTime() <= 90_000,
    }));
  }

  async listConversations(userId: string) {
    await this.assertMember(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: { groupId: null, OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(conversations.map((conversation) => this.present(conversation.id, userId)));
  }

  async openGroup(userId: string, groupId: string) {
    await this.assertGroupMember(groupId, userId);
    const conversation = await this.prisma.conversation.upsert({
      where: { groupId },
      update: {},
      create: { groupId },
    });
    return this.present(conversation.id, userId);
  }

  async listGroupConversations(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
    if (!user || user.status !== UserStatus.ACTIVE || !([Role.STUDENT, Role.CUSTOMER, Role.TEACHER] as Role[]).includes(user.role)) throw new ForbiddenException('Only active community members can use group chat');
    const groups = await this.prisma.communityGroup.findMany({
      where: { members: { some: { userId } } },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });
    const conversations = await Promise.all(groups.map((group) => this.prisma.conversation.upsert({ where: { groupId: group.id }, update: {}, create: { groupId: group.id }, select: { id: true } })));
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
    if (conversation.groupId) {
      const members = await this.prisma.communityGroupMember.findMany({ where: { groupId: conversation.groupId, userId: { not: userId } }, select: { userId: true } });
      await Promise.all(members.map((member) => this.notifications.createMessageNotification(member.userId, userId, messageBody)));
    } else if (conversation.userAId && conversation.userBId) {
      const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
      await this.notifications.createMessageNotification(recipientId, userId, messageBody);
    }
    return this.presentMessage({ ...message, reactions: [] }, userId);
  }

  async sendImage(userId: string, conversationId: string, file: Express.Multer.File, body = '') {
    const conversation = await this.assertParticipant(conversationId, userId);
    const messageBody = body.trim();
    const uploadedMedia = await this.media.upload(file, 'chat');
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: userId, body: messageBody, imageUrl: uploadedMedia.url, mediaType: uploadedMedia.mediaType as MediaType },
        include: { sender: { select: userSelect } },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });
    const notificationBody = messageBody || (uploadedMedia.mediaType === 'VIDEO' ? (conversation.groupId ? 'Sent a video to the group.' : 'Sent you a video.') : (conversation.groupId ? 'Sent an image to the group.' : 'Sent you an image.'));
    if (conversation.groupId) {
      const members = await this.prisma.communityGroupMember.findMany({ where: { groupId: conversation.groupId, userId: { not: userId } }, select: { userId: true } });
      await Promise.all(members.map((member) => this.notifications.createMessageNotification(member.userId, userId, notificationBody)));
    } else if (conversation.userAId && conversation.userBId) {
      const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
      await this.notifications.createMessageNotification(recipientId, userId, notificationBody);
    }
    return this.presentMessage({ ...message, reactions: [] }, userId);
  }

  async getImageForDownload(userId: string, messageId: string) {
    const message = await this.assertMessageParticipant(userId, messageId);
    const attachment = await this.prisma.message.findUnique({ where: { id: message.id }, select: { imageUrl: true, mediaType: true } });
    const imageUrl = attachment?.imageUrl;
    if (!imageUrl) throw new BadRequestException('This message does not contain an attachment');
    const contentTypes: Record<string, string> = { '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.mp4': 'video/mp4', '.png': 'image/png', '.webm': 'video/webm', '.webp': 'image/webp' };
    if (/^https?:\/\//i.test(imageUrl)) {
      const remotePath = new URL(imageUrl).pathname;
      const remoteName = basename(decodeURIComponent(remotePath)) || `campusflow-chat-${message.id}${attachment?.mediaType === 'VIDEO' ? '.mp4' : '.jpg'}`;
      return { remoteUrl: imageUrl, fileName: remoteName, contentType: contentTypes[extname(remoteName).toLowerCase()] || (attachment?.mediaType === 'VIDEO' ? 'video/mp4' : 'application/octet-stream') };
    }
    const relativePath = imageUrl.replace(/^\/?uploads[\\/]/, 'uploads/');
    const filePath = join(process.cwd(), relativePath);
    if (!existsSync(filePath)) throw new NotFoundException('Chat attachment not found');
    return { filePath, fileName: basename(filePath), contentType: contentTypes[extname(filePath).toLowerCase()] || (attachment?.mediaType === 'VIDEO' ? 'video/mp4' : 'application/octet-stream') };
  }

  private async assertMessageOwner(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId }, select: { id: true, conversationId: true, senderId: true, body: true, imageUrl: true, deletedAt: true } });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertParticipant(message.conversationId, userId);
    if (message.senderId !== userId) throw new ForbiddenException('You can only change your own messages');
    return message;
  }

  async editMessage(userId: string, messageId: string, body: string) {
    const message = await this.assertMessageOwner(userId, messageId);
    if (message.deletedAt) throw new BadRequestException('Deleted messages cannot be edited');
    const nextBody = body.trim();
    if (!nextBody) throw new BadRequestException('Message cannot be empty');
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.message.update({
        where: { id: messageId },
        data: { body: nextBody, editedAt: new Date() },
        include: { sender: { select: userSelect }, reactions: { select: { userId: true, type: true } } },
      });
      await tx.conversation.update({ where: { id: message.conversationId }, data: { updatedAt: new Date() } });
      return result;
    });
    return this.presentMessage(updated, userId);
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.assertMessageOwner(userId, messageId);
    if (message.deletedAt) return { id: messageId, isDeleted: true };
    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.messageReaction.deleteMany({ where: { messageId } });
      const result = await tx.message.update({
        where: { id: messageId },
        data: { body: '', imageUrl: null, editedAt: null, deletedAt: new Date() },
        include: { sender: { select: userSelect } },
      });
      await tx.conversation.update({ where: { id: message.conversationId }, data: { updatedAt: new Date() } });
      return result;
    });
    if (message.imageUrl && !/^https?:\/\//i.test(message.imageUrl)) {
      const filePath = join(process.cwd(), message.imageUrl.replace(/^\/?uploads[\\/]/, 'uploads/'));
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    return this.presentMessage({ ...deleted, reactions: [] }, userId);
  }

  private presentMessage(message: any, viewerId: string) {
    const reactionCounts = (message.reactions || []).reduce((counts: Record<string, number>, reaction: { type: MessageReactionType }) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});
    const reactionCount = Object.keys(reactionCounts).reduce((total, type) => total + reactionCounts[type], 0);
    return { ...message, isEdited: Boolean(message.editedAt), isDeleted: Boolean(message.deletedAt), reactions: reactionCounts, reactionCount, myReaction: (message.reactions || []).find((reaction: { userId: string }) => reaction.userId === viewerId)?.type || null };
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
