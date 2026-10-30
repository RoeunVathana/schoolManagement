import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostVisibility, Role } from '@prisma/client';
import { FriendsService } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService) {}

  private readonly authorSelect = { id: true, fullName: true, email: true, role: true, profileImageUrl: true, profile: { select: { username: true, firstName: true, lastName: true, avatar: true } } } as const;

  private async assertPostOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || (user.role !== Role.STUDENT && user.role !== Role.CUSTOMER)) throw new ForbiddenException('Only active students and customers can create posts');
  }

  async create(userId: string, input: { content: string; visibility?: PostVisibility; imageUrl?: string }) {
    await this.assertPostOwner(userId);
    const content = input.content.trim();
    if (!content) throw new BadRequestException('Post content cannot be empty');
    return this.prisma.post.create({ data: { authorId: userId, content, visibility: input.visibility || PostVisibility.FRIENDS_ONLY, imageUrl: input.imageUrl }, include: { author: { select: this.authorSelect } } });
  }

  async canView(post: { authorId: string; visibility: PostVisibility }, viewerId: string) {
    if (post.authorId === viewerId || post.visibility === PostVisibility.PUBLIC) return true;
    if (post.visibility === PostVisibility.PRIVATE) return false;
    return (await this.friends.friendshipStatus(viewerId, post.authorId)) === 'FRIENDS';
  }

  async listForProfile(ownerId: string, viewerId: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, status: true, role: true } });
    if (!owner || owner.status !== 'ACTIVE') throw new NotFoundException('Profile not found');
    const relationship = await this.friends.friendshipStatus(viewerId, ownerId);
    const visibility = relationship === 'SELF' ? undefined : relationship === 'FRIENDS' ? { in: [PostVisibility.PUBLIC, PostVisibility.FRIENDS_ONLY] } : PostVisibility.PUBLIC;
    return this.prisma.post.findMany({ where: { authorId: ownerId, visibility }, include: { author: { select: this.authorSelect } }, orderBy: { createdAt: 'desc' } });
  }

  async update(postId: string, userId: string, input: { content?: string; visibility?: PostVisibility; imageUrl?: string }) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');
    const data: { content?: string; visibility?: PostVisibility; imageUrl?: string } = {};
    if (input.content !== undefined) {
      const content = input.content.trim();
      if (!content) throw new BadRequestException('Post content cannot be empty');
      data.content = content;
    }
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    return this.prisma.post.update({ where: { id: postId }, data, include: { author: { select: this.authorSelect } } });
  }

  async remove(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only delete your own posts');
    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Post deleted' };
  }
}
