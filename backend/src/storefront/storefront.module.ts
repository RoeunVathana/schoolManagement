import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({ imports: [PaymentsModule], controllers: [StorefrontController] })
export class StorefrontModule {}
