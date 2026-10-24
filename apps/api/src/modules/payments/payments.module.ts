import { Module } from '@nestjs/common';
import { ENV } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.js';
import { BachsProvider } from './providers/bachs.provider.js';
import { FakeProvider } from './providers/fake.provider.js';

/** Picks the adapter from PAYMENT_PROVIDER. Adding a provider means one more case here. */
export function createPaymentProvider(env: Env): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'bachs':
      return new BachsProvider({
        // env.ts refuses to start without these when PAYMENT_PROVIDER=bachs.
        secretKey: env.BACHS_SECRET_KEY!,
        webhookSecret: env.BACHS_WEBHOOK_SECRET!,
      });
    case 'fake':
      return new FakeProvider();
  }
}

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ENV],
      useFactory: createPaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
