import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module.js';
import { FeesController } from './fees.controller.js';
import { FeesService } from './fees.service.js';
import { PaymentWebhooksController } from './payment-webhooks.controller.js';

@Module({
  imports: [PaymentsModule],
  controllers: [FeesController, PaymentWebhooksController],
  providers: [FeesService],
})
export class FeesModule {}
