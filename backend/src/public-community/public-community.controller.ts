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
    const publicUserWhere = { status: 'ACTIVE' as const, role: { in: [Role.STUDENT, Role.CUSTOMER] } };
    const authorSelect = {
      id: true,
      fullName: true,
      role: true,
      profileImageUrl: true,
      profile: { select: { username: true, firstName: true, lastName: true, avatar: true, bio: true, location: true, school: true, course: true } },
    } as const;

    const [members, posts] = await Promise.all([
      this.prisma.user.findMany({ where: publicUserWhere, select: authorSelect, orderBy: { createdAt: 'desc' }, take: 8 }),
      this.prisma.post.findMany({ where: { visibility: 'PUBLIC', author: publicUserWhere }, select: { id: true, content: true, imageUrl: true, createdAt: true, visibility: true, author: { select: authorSelect } }, orderBy: { createdAt: 'desc' }, take }),
    ]);

    return { members, posts };
  }
}
