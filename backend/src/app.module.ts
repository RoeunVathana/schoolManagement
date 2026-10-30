import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { CoursesModule } from './courses/courses.module';
import { CourseMaterialsModule } from './course-materials/course-materials.module';
import { CertificatesModule } from './certificates/certificates.module';
import { TelegramModule } from './telegram/telegram.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { GradesModule } from './grades/grades.module';
import { ExamsModule } from './exams/exams.module';
import { ExamResultsModule } from './exam-results/exam-results.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { StorefrontModule } from './storefront/storefront.module';
import { validateEnvironment } from './config/env.validation';
import { FriendsModule } from './friends/friends.module';
import { PostsModule } from './posts/posts.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ChatModule } from './chat/chat.module';
import { CommunitySupportModule } from './community-support/community-support.module';
import { StoriesModule } from './stories/stories.module';
import { PublicCommunityModule } from './public-community/public-community.module';
import { GroupsModule } from './groups/groups.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    TelegramModule,
    PaymentsModule,
    StorefrontModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    CoursesModule,
    CourseMaterialsModule,
    CertificatesModule,
    EnrollmentsModule,
    SchedulesModule,
    AttendanceModule,
    AssignmentsModule,
    SubmissionsModule,
    GradesModule,
    ExamsModule,
    ExamResultsModule,
    AnnouncementsModule,
    DashboardModule,
    NotificationsModule,
    FriendsModule,
    PostsModule,
    ProfilesModule,
    ChatModule,
    CommunitySupportModule,
    StoriesModule,
    PublicCommunityModule,
    GroupsModule,
    MediaModule,
  ],
})
export class AppModule {}
