import { Injectable, NotFoundException } from '@nestjs/common';
import { FriendsService } from '../friends/friends.service';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService, private readonly friends: FriendsService, private readonly posts: PostsService) {}

  async getProfile(viewerId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, fullName: true, email: true, firstName: true, lastName: true, phone: true, profileImageUrl: true, role: true, status: true, createdAt: true, profile: true } });
    if (!user || user.status !== 'ACTIVE') throw new NotFoundException('Profile not found');
    const [relationship, friends, posts] = await Promise.all([this.friends.relationship(viewerId, targetId), this.friends.listFriends(targetId), this.posts.listForProfile(targetId, viewerId)]);
    return {
      user: { ...user, profile: user.profile ? { ...user.profile, avatar: user.profileImageUrl || user.profile.avatar } : { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatar: user.profileImageUrl, role: user.role, accountStatus: user.status } },
      friendshipStatus: relationship.status,
      friendRequestId: relationship.requestId,
      friendCount: friends.length,
      posts,
    };
  }

  async listFriends(targetId: string) {
    return this.friends.listFriends(targetId);
  }
}
