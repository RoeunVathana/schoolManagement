import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, PostReactionType, PostVisibility, Role } from '@prisma/client';
import { FriendsService } from '../friends/friends.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService) {}

  private readonly authorSelect = { id: true, fullName: true, email: true, role: true, profileImageUrl: true, profile: { select: { username: true, firstName: true, lastName: true, avatar: true } } } as const;
  private readonly commentAuthorSelect = { id: true, fullName: true, role: true, profileImageUrl: true, profile: { select: { username: true, firstName: true, lastName: true, avatar: true } } } as const;

  private postInclude(viewerId: string) {
    return {
      author: { select: this.authorSelect },
      media: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, url: true, mediaType: true, sortOrder: true } },
      reactions: { select: { userId: true, type: true } },
      comments: { orderBy: { createdAt: 'desc' as const }, take: 3, select: { id: true, postId: true, authorId: true, content: true, createdAt: true, updatedAt: true, author: { select: this.commentAuthorSelect }, reactions: { select: { userId: true, type: true } }, _count: { select: { reactions: true } } } },
      _count: { select: { reactions: true, comments: true } },
    } as const;
  }

  private presentPost(post: any, viewerId?: string) {
    const { reactions, _count, media, comments, ...safePost } = post;
    const postMedia = media?.length ? media : safePost.imageUrl ? [{ id: `${safePost.id}-legacy`, url: safePost.imageUrl, mediaType: safePost.mediaType || MediaType.IMAGE, sortOrder: 0 }] : [];
    const reactionCounts = (reactions || []).reduce((counts: Record<string, number>, reaction: { type: PostReactionType }) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});
    return { ...safePost, media: postMedia, comments: (comments || []).map((comment: any) => this.presentComment(comment, viewerId)), commentCount: _count?.comments || 0, reactionCount: _count?.reactions || 0, reactionCounts, viewerReaction: reactions?.find((reaction: { userId: string }) => reaction.userId === viewerId)?.type || null };
  }

  private presentComment(comment: any, viewerId?: string) {
    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
      likeCount: comment._count?.reactions ?? comment.likeCount ?? 0,
      reactionCount: comment._count?.reactions ?? comment.reactionCount ?? comment.likeCount ?? 0,
      reactionCounts: (comment.reactions || []).reduce((counts: Record<string, number>, reaction: { type: PostReactionType }) => { counts[reaction.type] = (counts[reaction.type] || 0) + 1; return counts; }, {}),
      viewerReaction: comment.reactions?.find((reaction: { userId: string }) => reaction.userId === viewerId)?.type || comment.viewerReaction || null,
      viewerLiked: Boolean(comment.reactions?.some((reaction: { userId: string; type: PostReactionType }) => reaction.userId === viewerId && reaction.type === PostReactionType.LIKE) || comment.viewerLiked),
    };
  }

  private async assertCommenter(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    const communityRoles: Role[] = [Role.ADMIN, Role.STUDENT, Role.CUSTOMER, Role.TEACHER];
    if (!user || user.status !== 'ACTIVE' || !communityRoles.includes(user.role)) throw new ForbiddenException('Only active community members can comment on posts');
  }

  private async assertPostOwner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    const communityRoles: Role[] = [Role.STUDENT, Role.CUSTOMER, Role.TEACHER];
    if (!user || user.status !== 'ACTIVE' || !communityRoles.includes(user.role)) throw new ForbiddenException('Only active students, customers and teachers can create posts');
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
    const uploadedMedia = input.media?.filter((item) => Boolean(item?.url?.trim())) || [];
    if (uploadedMedia.length) {
      data.imageUrl = uploadedMedia[0].url;
      data.mediaType = uploadedMedia[0].mediaType;
    } else if (typeof input.imageUrl === 'string' && input.imageUrl.trim()) {
      data.imageUrl = input.imageUrl.trim();
      if (input.mediaType !== undefined) data.mediaType = input.mediaType;
    }

    // An edit without a newly uploaded file must be metadata-only. In
    // particular, an empty multipart media field must not wipe old media.
    const updatedPost = uploadedMedia.length
      ? await this.prisma.post.update({ where: { id: postId }, data: { ...data, media: { deleteMany: {}, create: uploadedMedia.map((item, sortOrder) => ({ url: item.url, mediaType: item.mediaType, sortOrder })) } }, include: this.postInclude(userId) })
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

  async listComments(postId: string, userId: string, limit = 30) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, visibility: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, userId))) throw new ForbiddenException('You cannot view comments on this post');
    const take = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const [comments, total] = await this.prisma.$transaction([
      this.prisma.postComment.findMany({ where: { postId }, orderBy: { createdAt: 'desc' }, take, include: { author: { select: this.commentAuthorSelect }, reactions: { select: { userId: true, type: true } }, _count: { select: { reactions: true } } } }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);
    return { items: comments.map((comment) => this.presentComment(comment, userId)), total, hasMore: total > comments.length };
  }

  async createComment(postId: string, userId: string, contentInput: string) {
    await this.assertCommenter(userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, visibility: true } });
    if (!post) throw new NotFoundException('Post not found');
    if (!(await this.canView(post, userId))) throw new ForbiddenException('You cannot comment on this post');
    const content = String(contentInput || '').trim();
    if (!content) throw new BadRequestException('Comment cannot be empty');
    if (content.length > 2000) throw new BadRequestException('Comment must be 2000 characters or fewer');
    const [comment, commentCount] = await this.prisma.$transaction([
      this.prisma.postComment.create({ data: { postId, authorId: userId, content }, include: { author: { select: this.commentAuthorSelect }, reactions: { select: { userId: true, type: true } }, _count: { select: { reactions: true } } } }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);
    return { comment: this.presentComment(comment, userId), commentCount };
  }

  async updateComment(postId: string, commentId: string, userId: string, contentInput: string) {
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true, authorId: true } });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('You can only edit your own comments');
    const content = String(contentInput || '').trim();
    if (!content) throw new BadRequestException('Comment cannot be empty');
    if (content.length > 2000) throw new BadRequestException('Comment must be 2000 characters or fewer');
    const updated = await this.prisma.postComment.update({ where: { id: commentId }, data: { content }, include: { author: { select: this.commentAuthorSelect }, reactions: { select: { userId: true, type: true } }, _count: { select: { reactions: true } } } });
    return this.presentComment(updated, userId);
  }

  async addCommentLike(postId: string, commentId: string, userId: string, type: PostReactionType = PostReactionType.LIKE) {
    await this.assertCommenter(userId);
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId }, select: { postId: true, post: { select: { authorId: true, visibility: true } } } });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');
    if (!(await this.canView(comment.post, userId))) throw new ForbiddenException('You cannot like this comment');
    await this.prisma.postCommentReaction.upsert({ where: { commentId_userId: { commentId, userId } }, create: { commentId, userId, type }, update: { type } });
    return this.commentReactionResult(commentId, userId);
  }

  async removeCommentLike(postId: string, commentId: string, userId: string) {
    await this.assertCommenter(userId);
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId }, select: { postId: true, post: { select: { authorId: true, visibility: true } } } });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');
    if (!(await this.canView(comment.post, userId))) throw new ForbiddenException('You cannot unlike this comment');
    await this.prisma.postCommentReaction.deleteMany({ where: { commentId, userId } });
    return this.commentReactionResult(commentId, userId);
  }

  async removeComment(postId: string, commentId: string, userId: string) {
    const [comment, user] = await Promise.all([
      this.prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true, authorId: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && user?.role !== Role.ADMIN) throw new ForbiddenException('You can only delete your own comments');
    await this.prisma.postComment.delete({ where: { id: commentId } });
    const commentCount = await this.prisma.postComment.count({ where: { postId } });
    return { id: commentId, commentCount, removed: true };
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

  private async commentReactionResult(commentId: string, userId: string) {
    const [reactions, reaction] = await this.prisma.$transaction([
      this.prisma.postCommentReaction.findMany({ where: { commentId }, select: { type: true } }),
      this.prisma.postCommentReaction.findUnique({ where: { commentId_userId: { commentId, userId } }, select: { type: true } }),
    ]);
    const reactionCounts = reactions.reduce((counts: Record<string, number>, item: { type: PostReactionType }) => { counts[item.type] = (counts[item.type] || 0) + 1; return counts; }, {});
    return { commentId, liked: reaction?.type === PostReactionType.LIKE, likeCount: reactions.length, reacted: Boolean(reaction), reactionCount: reactions.length, reactionCounts, viewerReaction: reaction?.type || null };
  }
}
