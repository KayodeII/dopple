import { loadEnv } from '../../config/env.js';
import { createPaymentProvider } from './payments.module.js';
import { FakeProvider } from './providers/fake.provider.js';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('payment provider selection', () => {
  it('uses the fake provider unless told otherwise, and treats blank keys as unset', () => {
    const env = loadEnv({
      ...base,
      BACHS_SECRET_KEY: '',
      BACHS_WEBHOOK_SECRET: '',
    });
    expect(createPaymentProvider(env).name).toBe('fake');
  });

  it('switches to Bachs with just the setting and its keys', () => {
    const env = loadEnv({
      ...base,
      PAYMENT_PROVIDER: 'bachs',
      BACHS_SECRET_KEY: 'sk_sandbox_abc',
      BACHS_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(createPaymentProvider(env).name).toBe('bachs');
  });

  it('refuses to start with missing or malformed keys, or fake money in production', () => {
    expect(() => loadEnv({ ...base, PAYMENT_PROVIDER: 'bachs' })).toThrow(
      /BACHS_SECRET_KEY/,
    );
    expect(() =>
      loadEnv({
        ...base,
        PAYMENT_PROVIDER: 'bachs',
        BACHS_SECRET_KEY: 'pk_abc',
        BACHS_WEBHOOK_SECRET: 'x',
      }),
    ).toThrow(/sk_sandbox_/);
    expect(() =>
      loadEnv({ ...base, NODE_ENV: 'production', JWT_PRIVATE_KEY: 'k' }),
    ).toThrow(/cannot be fake in production/);
  });
});

describe('FakeProvider', () => {
  it('accepts only deliveries it signed', () => {
    const fake = new FakeProvider();
    const event = {
      type: 'payment.succeeded' as const,
      eventId: 'evt_1',
      accountId: 'fake_acct_1',
      reference: 'fee_1',
      amountMinor: 100,
      currency: 'NGN',
    };
    expect(fake.parseWebhook(fake.signedDelivery(event))).toEqual(event);
    expect(() =>
      new FakeProvider('other').parseWebhook(fake.signedDelivery(event)),
    ).toThrow();
  });
});
