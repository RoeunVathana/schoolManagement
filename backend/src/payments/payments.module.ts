import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { BakongSettingsController } from './bakong-settings.controller';
import { BakongSettingsService } from './bakong-settings.service';
import { TelegramModule } from '../telegram/telegram.module';
import { MailModule } from '../mail/mail.module';

@Module({ imports: [ConfigModule, PrismaModule, TelegramModule, MailModule], controllers: [PaymentsController, BakongSettingsController], providers: [PaymentService, BakongSettingsService], exports: [PaymentService, BakongSettingsService] })
export class PaymentsModule {}
