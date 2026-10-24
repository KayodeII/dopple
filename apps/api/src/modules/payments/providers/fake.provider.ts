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
 * For local runs and tests: no network, no money. Accounts are active at once and
 * the "payment page" is the success URL. Tests pay by posting `signedDelivery(event)`
 * to the webhook endpoint, which goes through the same path a real provider does.
 */
export class FakeProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly accounts = new Map<string, SchoolAccount>();

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
    const account = this.accounts.get(accountId);
    return account
      ? Promise.resolve(account)
      : Promise.reject(new Error(`no fake account ${accountId}`));
  }

  createCheckout(input: NewCheckout): Promise<Checkout> {
    const checkoutId = `fake_chk_${input.reference}`;
    const url = new URL(input.successUrl);
    url.searchParams.set('checkout_id', checkoutId);
    return Promise.resolve({ checkoutId, url: url.toString() });
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
