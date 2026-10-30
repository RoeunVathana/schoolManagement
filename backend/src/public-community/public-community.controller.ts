import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('public-community')
@Controller('api/community')
export class PublicCommunityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async feed(@Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit) || 12, 1), 24);
    const publicUserWhere = { status: 'ACTIVE' as const, role: { in: [Role.STUDENT, Role.CUSTOMER, Role.TEACHER] } };
    const authorSelect = {
      id: true,
      fullName: true,
      role: true,
      profileImageUrl: true,
      profile: { select: { username: true, firstName: true, lastName: true, avatar: true, bio: true, location: true, school: true, course: true } },
    } as const;

    const [members, posts] = await Promise.all([
      this.prisma.user.findMany({ where: publicUserWhere, select: authorSelect, orderBy: { createdAt: 'desc' }, take: 8 }),
      this.prisma.post.findMany({ where: { visibility: 'PUBLIC', author: publicUserWhere }, select: { id: true, content: true, imageUrl: true, mediaType: true, createdAt: true, visibility: true, media: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, mediaType: true, sortOrder: true } }, reactions: { select: { type: true } }, _count: { select: { reactions: true } }, author: { select: authorSelect } }, orderBy: { createdAt: 'desc' }, take }),
    ]);

    return { members, posts: posts.map(({ _count, reactions, media, ...post }) => ({ ...post, media: media.length ? media : post.imageUrl ? [{ id: `${post.id}-legacy`, url: post.imageUrl, mediaType: post.mediaType || 'IMAGE', sortOrder: 0 }] : [], reactionCount: _count.reactions, reactionCounts: reactions.reduce((counts: Record<string, number>, reaction: { type: string }) => { counts[reaction.type] = (counts[reaction.type] || 0) + 1; return counts; }, {}), viewerReaction: null })) };
  }
}
