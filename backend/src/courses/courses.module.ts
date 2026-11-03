import { Module } from '@nestjs/common'; import { CoursesController } from './courses.controller';
import { TelegramModule } from '../telegram/telegram.module';
@Module({ imports: [TelegramModule], controllers: [CoursesController] }) export class CoursesModule {}
