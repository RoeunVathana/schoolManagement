import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from '../auth/mail.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailSettingsController } from './mail-settings.controller';
import { MailSettingsService } from './mail-settings.service';

@Module({ imports: [ConfigModule, PrismaModule], controllers: [MailSettingsController], providers: [MailSettingsService, MailService], exports: [MailService, MailSettingsService] })
export class MailModule {}
