import { Injectable } from '@nestjs/common';
import { CoursePaymentPlan, EnrollmentStatus, PaymentStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFriendRequestNotification(userId: string, senderId: string, message: string) {
    return this.prisma.notification.create({ data: { userId, senderId, title: 'Friend request', message } });
  }

  async syncMonthlyPaymentReminders(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (!student) return;

    const currentPeriod = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit' }).format(new Date());
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, status: EnrollmentStatus.ACTIVE, course: { monthlyPaymentEnabled: true } },
      select: { courseId: true, course: { select: { courseName: true } } },
    });
    if (!enrollments.length) return;

    const paidPayments = await this.prisma.coursePayment.findMany({
      where: { studentId: student.id, status: PaymentStatus.PAID, paymentPlan: CoursePaymentPlan.MONTHLY, courseId: { in: enrollments.map((enrollment) => enrollment.courseId) } },
      select: { courseId: true, billingPeriod: true, paidAt: true },
      orderBy: { paidAt: 'desc' },
    });
    const latestByCourse = new Map<string, (typeof paidPayments)[number]>();
    for (const payment of paidPayments) if (!latestByCourse.has(payment.courseId)) latestByCourse.set(payment.courseId, payment);

    for (const enrollment of enrollments) {
      const latest = latestByCourse.get(enrollment.courseId);
      if (!latest?.billingPeriod || latest.billingPeriod >= currentPeriod) continue;

      const title = 'Monthly payment due';
      const paidDate = latest.paidAt ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', dateStyle: 'medium' }).format(latest.paidAt) : latest.billingPeriod;
      const message = `Your monthly payment for ${enrollment.course.courseName} is due for ${currentPeriod}. Last payment: ${paidDate}. Please open the course and complete this month's payment.`;
      const existing = await this.prisma.notification.findFirst({ where: { userId, title, message } });
      if (!existing) await this.prisma.notification.create({ data: { userId, title, message } });
    }
  }

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
