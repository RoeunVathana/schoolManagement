import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyAnnouncement(announcement: { id: string; courseId: string | null; title: string; content: string }, actor: { id: string; role: Role }) {
    let userIds: string[] = [];
    if (actor.role === Role.ADMIN) {
      const recipients = await this.prisma.user.findMany({ where: { id: { not: actor.id }, role: { in: [Role.TEACHER, Role.STUDENT] }, status: UserStatus.ACTIVE }, select: { id: true } });
      userIds = recipients.map((user) => user.id);
    } else if (actor.role === Role.TEACHER) {
      if (announcement.courseId) {
        const enrollments = await this.prisma.enrollment.findMany({ where: { courseId: announcement.courseId, status: EnrollmentStatus.ACTIVE }, select: { student: { select: { userId: true } } } });
        userIds = enrollments.map((enrollment) => enrollment.student.userId);
      } else {
        const recipients = await this.prisma.user.findMany({ where: { role: Role.STUDENT, status: UserStatus.ACTIVE }, select: { id: true } });
        userIds = recipients.map((user) => user.id);
      }
    }
    if (!userIds.length) return { count: 0 };
    return this.prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, senderId: actor.id, title: announcement.title, message: announcement.content })) });
  }
}
