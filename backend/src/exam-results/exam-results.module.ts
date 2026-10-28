import { Module } from '@nestjs/common'; import { ExamResultsController } from './exam-results.controller';
@Module({ controllers: [ExamResultsController] }) export class ExamResultsModule {}
