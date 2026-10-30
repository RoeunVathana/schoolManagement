import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostVisibility, Role } from '@prisma/client';
import { FriendsService } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService) {}

  private readonly authorSelect = { id: true, fullName: true, email: true, role: true, profileImageUrl: true, profile: { select: { username: true, firstName: true, lastName: true, avatar: true } } } as const;

  private postInclude(viewerId: string) {
    return {
      author: { select: this.authorSelect },
      reactions: { where: { userId: viewerId }, select: { type: true } },
      _count: { select: { reactions: true } },
    } as const;
  }

  private presentPost(post: any) {
    const { reactions, _count, ...safePost } = post;
    return { ...safePost, reactionCount: _count?.reactions || 0, viewerReaction: reactions?.[0]?.type || null };
  }

  private async assertPostOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || (user.role !== Role.STUDENT && user.role !== Role.CUSTOMER)) throw new ForbiddenException('Only active students and customers can create posts');
  }

  async create(userId: string, input: { content: string; visibility?: PostVisibility; imageUrl?: string }) {
    await this.assertPostOwner(userId);
    const content = input.content.trim();
    if (!content) throw new BadRequestException('Post content cannot be empty');
    const post = await this.prisma.post.create({ data: { authorId: userId, content, visibility: input.visibility || PostVisibility.FRIENDS_ONLY, imageUrl: input.imageUrl }, include: this.postInclude(userId) });
    return this.presentPost(post);
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
    const posts = await this.prisma.post.findMany({ where: { authorId: ownerId, visibility }, include: this.postInclude(viewerId), orderBy: { createdAt: 'desc' } });
    return posts.map((post) => this.presentPost(post));
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
    const updatedPost = await this.prisma.post.update({ where: { id: postId }, data, include: this.postInclude(userId) });
    return this.presentPost(updatedPost);
  }

  async remove(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only delete your own posts');
    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Post deleted' };
  }

  async addReaction(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, visibility: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, userId))) throw new ForbiddenException('You cannot react to this post');
    await this.prisma.postReaction.upsert({ where: { postId_userId: { postId, userId } }, create: { postId, userId }, update: {} });
    return this.reactionResult(postId, userId);
  }

  async removeReaction(postId: string, userId: string) {
    await this.prisma.postReaction.deleteMany({ where: { postId, userId } });
    return this.reactionResult(postId, userId);
  }

  private async reactionResult(postId: string, userId: string) {
    const [reactionCount, reaction] = await this.prisma.$transaction([
      this.prisma.postReaction.count({ where: { postId } }),
      this.prisma.postReaction.findUnique({ where: { postId_userId: { postId, userId } }, select: { type: true } }),
    ]);
    return { reacted: Boolean(reaction), reactionCount, viewerReaction: reaction?.type || null };
  }
}
