import { createHmac } from 'node:crypto';
import { InvalidWebhookError } from '../payment-provider.js';
import { BachsApiError, BachsProvider } from './bachs.provider.js';

const webhookSecret = 'whsec_test';
const now = new Date('2026-10-24T12:00:00Z');
const timestamp = String(now.getTime() / 1000);

function provider(
  respond: (url: string, init: RequestInit) => Response = () =>
    Response.json({}),
  secretKey = 'sk_sandbox_abc',
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond(url, init);
  }) as typeof globalThis.fetch;
  return {
    bachs: new BachsProvider({
      secretKey,
      webhookSecret,
      fetch,
      now: () => now,
    }),
    calls,
  };
}

function sign(body: string, secret = webhookSecret, t = timestamp) {
  return createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
}

const succeeded = JSON.stringify({
  id: 'evt_1',
  type: 'collection.succeeded',
  account: 'acct_school',
  data: {
    reference: 'fee_42',
    amount: '75000.00',
    currency: 'NGN',
    status: 'SUCCEEDED',
    metadata: { tenantId: 't1' },
  },
});

describe('BachsProvider', () => {
  it('picks the sandbox or production host from the key', async () => {
    const sandbox = provider(() =>
      Response.json({ id: 'acct_1', is_active: true }),
    );
    await sandbox.bachs.getSchoolAccount('acct_1');
    expect(sandbox.calls[0].url).toBe(
      'https://sandbox-api.bachs.io/v1/accounts/acct_1',
    );

    const live = provider(
      () => Response.json({ id: 'acct_1', is_active: true }),
      'sk_live_abc',
    );
    await live.bachs.getSchoolAccount('acct_1');
    expect(live.calls[0].url).toBe('https://api.bachs.io/v1/accounts/acct_1');
  });

  it('creates a direct charge on the school account, in naira, idempotently', async () => {
    const { bachs, calls } = provider(() =>
      Response.json({
        checkout_id: 'chk_1',
        checkout_url: 'https://checkout.bachs.io/c/x',
      }),
    );
    const checkout = await bachs.createCheckout({
      accountId: 'acct_school',
      amountMinor: 7_500_000,
      currency: 'NGN',
      reference: 'fee_42',
      payerEmail: 'parent@example.com',
      successUrl: 'https://greenfield.dopple.school/fees/paid',
      cancelUrl: 'https://greenfield.dopple.school/fees',
      platformFeeMinor: 10_000,
      metadata: { tenantId: 't1' },
    });

    expect(checkout).toEqual({
      checkoutId: 'chk_1',
      url: 'https://checkout.bachs.io/c/x',
    });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk_sandbox_abc');
    expect(headers['X-Account-Id']).toBe('acct_school');
    expect(headers['Idempotency-Key']).toBe('checkout_fee_42');
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      pricing: { currency: 'NGN', amount: '75000.00' },
      customer: { email: 'parent@example.com' },
      reference: 'fee_42',
      metadata: { tenantId: 't1', reference: 'fee_42' },
      platform_fee: '100.00',
    });
  });

  it('reports what an account still needs', async () => {
    const { bachs } = provider(() =>
      Response.json({
        id: 'acct_1',
        is_active: false,
        requirements: { currently_due: ['persons.name'], past_due: [] },
      }),
    );
    await expect(bachs.getSchoolAccount('acct_1')).resolves.toEqual({
      accountId: 'acct_1',
      status: 'pending',
      requirementsDue: ['persons.name'],
    });
  });

  it('turns API errors into BachsApiError with the code', async () => {
    const { bachs } = provider(() =>
      Response.json(
        { error_code: 'NOT_FOUND', detail: 'Account not found' },
        { status: 404 },
      ),
    );
    const error = await bachs
      .getSchoolAccount('acct_x')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BachsApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  describe('webhooks', () => {
    const { bachs } = provider();
    const deliver = (headers: Record<string, string>, body = succeeded) =>
      bachs.parseWebhook({ headers, rawBody: Buffer.from(body) });

    it('accepts a signed payment and translates it', () => {
      expect(
        deliver({
          'x-bachs-timestamp': timestamp,
          'x-bachs-signature': sign(succeeded),
        }),
      ).toEqual({
        type: 'payment.succeeded',
        eventId: 'evt_1',
        accountId: 'acct_school',
        reference: 'fee_42',
        amountMinor: 7_500_000,
        currency: 'NGN',
        metadata: { tenantId: 't1' },
      });
    });

    it('accepts any v1 signature in the V2 header (secret rotation)', () => {
      const v2 = `t=${timestamp},v1=${sign(succeeded, 'whsec_old')},v1=${sign(succeeded)}`;
      expect(deliver({ 'x-bachs-signature-v2': v2 })?.type).toBe(
        'payment.succeeded',
      );
    });

    it('refuses a wrong signature, a changed body and an old delivery', () => {
      expect(() =>
        deliver({
          'x-bachs-timestamp': timestamp,
          'x-bachs-signature': sign(succeeded, 'nope'),
        }),
      ).toThrow(InvalidWebhookError);
      expect(() =>
        deliver(
          {
            'x-bachs-timestamp': timestamp,
            'x-bachs-signature': sign(succeeded),
          },
          succeeded.replace('75000.00', '1.00'),
        ),
      ).toThrow(InvalidWebhookError);
      const old = String(Number(timestamp) - 301);
      expect(() =>
        deliver({
          'x-bachs-timestamp': old,
          'x-bachs-signature': sign(succeeded, webhookSecret, old),
        }),
      ).toThrow(InvalidWebhookError);
      expect(() => deliver({})).toThrow(InvalidWebhookError);
    });

    it('ignores events Dopple does not use', () => {
      const body = JSON.stringify({
        id: 'evt_2',
        type: 'customer.created',
        data: {},
      });
      expect(
        deliver(
          { 'x-bachs-timestamp': timestamp, 'x-bachs-signature': sign(body) },
          body,
        ),
      ).toBeNull();
    });
  });
});
