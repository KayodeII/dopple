import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  type Checkout,
  InvalidWebhookError,
  type NewCheckout,
  type NewSchoolAccount,
  type PaymentEvent,
  type PaymentProvider,
  type SchoolAccount,
  type WebhookDelivery,
} from '../payment-provider.js';

const SIGNATURE_HEADER = 'x-fake-signature';

/**
 * For local runs and tests: no network, no money. Accounts are active at once. The
 * "payment page" is `/api/payments/fake/pay` on the school's own address, which pays
 * by sending this provider's signed webhook through the same path a real one takes.
 * State is in memory, so checkouts are forgotten when the API restarts.
 */
export class FakeProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly accounts = new Map<string, SchoolAccount>();
  private readonly checkouts = new Map<string, NewCheckout>();

  constructor(private readonly webhookSecret = 'fake-webhook-secret') {}

  createSchoolAccount(_input: NewSchoolAccount): Promise<SchoolAccount> {
    const account: SchoolAccount = {
      accountId: `fake_acct_${randomUUID()}`,
      status: 'active',
      requirementsDue: [],
    };
    this.accounts.set(account.accountId, account);
    return Promise.resolve(account);
  }

  getSchoolAccount(accountId: string): Promise<SchoolAccount> {
    // Accounts made before a restart are still "there", as they would be at a provider.
    return Promise.resolve(
      this.accounts.get(accountId) ?? {
        accountId,
        status: 'active',
        requirementsDue: [],
      },
    );
  }

  createCheckout(input: NewCheckout): Promise<Checkout> {
    const checkoutId = `fake_chk_${input.reference}`;
    this.checkouts.set(checkoutId, input);
    const url = new URL('/api/payments/fake/pay', input.successUrl);
    url.searchParams.set('checkout_id', checkoutId);
    return Promise.resolve({ checkoutId, url: url.toString() });
  }

  /** What the fake payment page does: the payment event for a checkout, and where to go next. */
  pay(
    checkoutId: string,
  ): { delivery: WebhookDelivery; returnUrl: string } | null {
    const checkout = this.checkouts.get(checkoutId);
    if (!checkout) return null;
    this.checkouts.delete(checkoutId);
    const returnUrl = new URL(checkout.successUrl);
    returnUrl.searchParams.set('checkout_id', checkoutId);
    return {
      delivery: this.signedDelivery({
        type: 'payment.succeeded',
        eventId: `fake_evt_${randomUUID()}`,
        accountId: checkout.accountId,
        reference: checkout.reference,
        amountMinor: checkout.amountMinor,
        currency: checkout.currency,
        metadata: checkout.metadata,
      }),
      returnUrl: returnUrl.toString(),
    };
  }

  parseWebhook({ headers, rawBody }: WebhookDelivery): PaymentEvent | null {
    const given = headers[SIGNATURE_HEADER];
    const expected = this.sign(rawBody);
    if (
      typeof given !== 'string' ||
      given.length !== expected.length ||
      !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
    ) {
      throw new InvalidWebhookError('webhook signature does not match');
    }
    return JSON.parse(rawBody.toString('utf8')) as PaymentEvent;
  }

  /** A delivery this provider accepts, as if the event had happened. */
  signedDelivery(event: PaymentEvent): WebhookDelivery {
    const rawBody = Buffer.from(JSON.stringify(event));
    return { headers: { [SIGNATURE_HEADER]: this.sign(rawBody) }, rawBody };
  }

  private sign(rawBody: Buffer) {
    return createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
  }
}
