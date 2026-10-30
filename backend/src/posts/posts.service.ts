import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, PostReactionType, PostVisibility, Role } from '@prisma/client';
import { FriendsService } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService) {}

  private readonly authorSelect = { id: true, fullName: true, email: true, role: true, profileImageUrl: true, profile: { select: { username: true, firstName: true, lastName: true, avatar: true } } } as const;

  private postInclude(viewerId: string) {
    return {
      author: { select: this.authorSelect },
      media: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, url: true, mediaType: true, sortOrder: true } },
      reactions: { select: { userId: true, type: true } },
      _count: { select: { reactions: true } },
    } as const;
  }

  private presentPost(post: any, viewerId?: string) {
    const { reactions, _count, media, ...safePost } = post;
    const postMedia = media?.length ? media : safePost.imageUrl ? [{ id: `${safePost.id}-legacy`, url: safePost.imageUrl, mediaType: safePost.mediaType || MediaType.IMAGE, sortOrder: 0 }] : [];
    const reactionCounts = (reactions || []).reduce((counts: Record<string, number>, reaction: { type: PostReactionType }) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});
    return { ...safePost, media: postMedia, reactionCount: _count?.reactions || 0, reactionCounts, viewerReaction: reactions?.find((reaction: { userId: string }) => reaction.userId === viewerId)?.type || null };
  }

  private async assertPostOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== 'ACTIVE' || (user.role !== Role.STUDENT && user.role !== Role.CUSTOMER)) throw new ForbiddenException('Only active students and customers can create posts');
  }

  async create(userId: string, input: { content: string; visibility?: PostVisibility; imageUrl?: string; mediaType?: MediaType; media?: { url: string; mediaType: MediaType }[] }) {
    await this.assertPostOwner(userId);
    const content = input.content.trim();
    if (!content) throw new BadRequestException('Post content cannot be empty');
    const media = input.media?.length ? input.media : input.imageUrl ? [{ url: input.imageUrl, mediaType: input.mediaType || MediaType.IMAGE }] : [];
    const post = await this.prisma.post.create({ data: { authorId: userId, content, visibility: input.visibility || PostVisibility.FRIENDS_ONLY, imageUrl: media[0]?.url, mediaType: media[0]?.mediaType, media: media.length ? { create: media.map((item, sortOrder) => ({ url: item.url, mediaType: item.mediaType, sortOrder })) } : undefined }, include: this.postInclude(userId) });
    return this.presentPost(post, userId);
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
    return posts.map((post) => this.presentPost(post, viewerId));
  }

  async update(postId: string, userId: string, input: { content?: string; visibility?: PostVisibility; imageUrl?: string; mediaType?: MediaType; media?: { url: string; mediaType: MediaType }[] }) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only edit your own posts');
    const data: { content?: string; visibility?: PostVisibility; imageUrl?: string | null; mediaType?: MediaType | null } = {};
    if (input.content !== undefined) {
      const content = input.content.trim();
      if (!content) throw new BadRequestException('Post content cannot be empty');
      data.content = content;
    }
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.mediaType !== undefined) data.mediaType = input.mediaType;
    if (input.media !== undefined) {
      data.imageUrl = input.media[0]?.url || null;
      data.mediaType = input.media[0]?.mediaType || null;
    }
    const updatedPost = input.media !== undefined
      ? await this.prisma.post.update({ where: { id: postId }, data: { ...data, media: { deleteMany: {}, create: input.media.map((item, sortOrder) => ({ url: item.url, mediaType: item.mediaType, sortOrder })) } }, include: this.postInclude(userId) })
      : await this.prisma.post.update({ where: { id: postId }, data, include: this.postInclude(userId) });
    return this.presentPost(updatedPost, userId);
  }

  async remove(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only delete your own posts');
    await this.prisma.post.delete({ where: { id: postId } });
    return { message: 'Post deleted' };
  }

  async addReaction(postId: string, userId: string, type: PostReactionType = PostReactionType.LIKE) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, visibility: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, userId))) throw new ForbiddenException('You cannot react to this post');
    await this.prisma.postReaction.upsert({ where: { postId_userId: { postId, userId } }, create: { postId, userId, type }, update: { type } });
    return this.reactionResult(postId, userId);
  }

  async removeReaction(postId: string, userId: string) {
    await this.prisma.postReaction.deleteMany({ where: { postId, userId } });
    return this.reactionResult(postId, userId);
  }

  private async reactionResult(postId: string, userId: string) {
    const [reactions, reaction] = await this.prisma.$transaction([
      this.prisma.postReaction.findMany({ where: { postId }, select: { type: true } }),
      this.prisma.postReaction.findUnique({ where: { postId_userId: { postId, userId } }, select: { type: true } }),
    ]);
    const reactionCounts = reactions.reduce((counts: Record<string, number>, item: { type: PostReactionType }) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
      return counts;
    }, {});
    return { reacted: Boolean(reaction), reactionCount: reactions.length, reactionCounts, viewerReaction: reaction?.type || null };
  }
}
