import { Module } from '@nestjs/common'; import { AttendanceController } from './attendance.controller'; import { TelegramModule } from '../telegram/telegram.module';
@Module({ imports: [TelegramModule], controllers: [AttendanceController] }) export class AttendanceModule {}
