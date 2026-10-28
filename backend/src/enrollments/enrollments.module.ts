import { Module } from '@nestjs/common'; import { EnrollmentsController } from './enrollments.controller'; import { PaymentsModule } from '../payments/payments.module';
@Module({ imports: [PaymentsModule], controllers: [EnrollmentsController] }) export class EnrollmentsModule {}
