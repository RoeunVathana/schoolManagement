import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostVisibility, Role } from '@prisma/client';
import { FriendsService } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

const COMMUNITY_ROLES = [Role.STUDENT, Role.CUSTOMER];

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService) {}

  private readonly authorSelect = { id: true, fullName: true, role: true, profileImageUrl: true, profile: { select: { avatar: true, username: true } } } as const;

  private async assertCommunityUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || !COMMUNITY_ROLES.some((role) => role === user.role)) throw new ForbiddenException('Only active students and customers can use stories');
    return user;
  }

  async listForViewer(viewerId: string) {
    await this.assertCommunityUser(viewerId);
    const friends = await this.friends.listFriends(viewerId);
    const visibleFriendIds = friends.map((friend) => friend.id);
    return this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: [
          { authorId: viewerId },
          { visibility: PostVisibility.PUBLIC },
          { authorId: { in: visibleFriendIds }, visibility: PostVisibility.FRIENDS_ONLY },
        ],
      },
      include: { author: { select: this.authorSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, input: { content?: string; visibility?: PostVisibility; imageUrl?: string }) {
    await this.assertCommunityUser(userId);
    const content = input.content?.trim() || null;
    if (!content && !input.imageUrl) throw new BadRequestException('Add story text or an image before posting');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.story.create({ data: { authorId: userId, content, imageUrl: input.imageUrl, visibility: input.visibility || PostVisibility.FRIENDS_ONLY, expiresAt }, include: { author: { select: this.authorSelect } } });
  }

  async update(storyId: string, userId: string, input: { content?: string; visibility?: PostVisibility; imageUrl?: string }) {
    await this.assertCommunityUser(userId);
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true, content: true, imageUrl: true } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId !== userId) throw new ForbiddenException('You can only edit your own stories');
    const content = input.content === undefined ? story.content : (input.content.trim() || null);
    const imageUrl = input.imageUrl === undefined ? story.imageUrl : input.imageUrl;
    if (!content && !imageUrl) throw new BadRequestException('A story must contain text or an image');
    return this.prisma.story.update({ where: { id: storyId }, data: { content, imageUrl, visibility: input.visibility }, include: { author: { select: this.authorSelect } } });
  }

  async remove(storyId: string, userId: string) {
    await this.assertCommunityUser(userId);
    const story = await this.prisma.story.findUnique({ where: { id: storyId }, select: { authorId: true } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId !== userId) throw new ForbiddenException('You can only delete your own stories');
    await this.prisma.story.delete({ where: { id: storyId } });
    return { message: 'Story deleted' };
  }
}
