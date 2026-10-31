import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { TelegramModule } from '../telegram/telegram.module';
import { MailModule } from '../mail/mail.module';

@Module({ imports: [TelegramModule, MailModule], controllers: [PaymentsController], providers: [PaymentService], exports: [PaymentService] })
export class PaymentsModule {}
