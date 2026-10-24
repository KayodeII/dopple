import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  type Checkout,
  decimalToMinor,
  InvalidWebhookError,
  minorToDecimal,
  type NewCheckout,
  type NewSchoolAccount,
  type PaymentEvent,
  type PaymentProvider,
  type SchoolAccount,
  type WebhookDelivery,
} from '../payment-provider.js';

/** Bachs rejects deliveries older than this in its own examples; so do we (replay guard). */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface BachsConfig {
  /** `sk_sandbox_…` talks to the sandbox, `sk_live_…` to production: the key picks the host. */
  secretKey: string;
  webhookSecret: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

interface BachsAccount {
  id: string;
  is_active: boolean;
  requirements?: {
    currently_due?: string[];
    past_due?: string[];
    errors?: unknown[];
  };
}

interface BachsEvent {
  id: string;
  type: string;
  account?: string;
  data?: {
    reference?: string | null;
    amount?: string;
    currency?: string;
    metadata?: Record<string, string>;
  };
}

export class BachsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(`Bachs ${status} ${code}: ${detail}`);
  }
}

/**
 * Bachs Connect (https://docs.bachs.io/connect/overview). Each school is a connected
 * account and fees are direct charges on it, so the school is the merchant of record.
 */
export class BachsProvider implements PaymentProvider {
  readonly name = 'bachs';
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly config: BachsConfig) {
    this.baseUrl = config.secretKey.startsWith('sk_live_')
      ? 'https://api.bachs.io'
      : 'https://sandbox-api.bachs.io';
    this.fetch = config.fetch ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  async createSchoolAccount(input: NewSchoolAccount): Promise<SchoolAccount> {
    const account = await this.request<BachsAccount>('POST', '/v1/accounts', {
      body: {
        display_name: input.schoolName,
        contact_email: input.contactEmail,
        country: 'NG',
      },
    });
    return toSchoolAccount(account);
  }

  async getSchoolAccount(accountId: string): Promise<SchoolAccount> {
    const account = await this.request<BachsAccount>(
      'GET',
      `/v1/accounts/${encodeURIComponent(accountId)}`,
    );
    return toSchoolAccount(account);
  }

  async createCheckout(input: NewCheckout): Promise<Checkout> {
    const session = await this.request<{
      checkout_id: string;
      checkout_url: string;
    }>('POST', '/v1/checkout-sessions', {
      // The account header makes this a direct charge (money lands with the school).
      account: input.accountId,
      // A retried request with the same reference returns the same checkout.
      idempotencyKey: `checkout_${input.reference}`,
      body: {
        pricing: {
          currency: input.currency,
          amount: minorToDecimal(input.amountMinor),
        },
        customer: { email: input.payerEmail },
        reference: input.reference,
        metadata: { reference: input.reference },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        ...(input.platformFeeMinor
          ? { platform_fee: minorToDecimal(input.platformFeeMinor) }
          : {}),
      },
    });
    return { checkoutId: session.checkout_id, url: session.checkout_url };
  }

  parseWebhook({ headers, rawBody }: WebhookDelivery): PaymentEvent | null {
    this.verifySignature(headers, rawBody);
    const event = JSON.parse(rawBody.toString('utf8')) as BachsEvent;

    switch (event.type) {
      case 'collection.succeeded':
      case 'collection.failed': {
        const data = event.data ?? {};
        return {
          type:
            event.type === 'collection.succeeded'
              ? 'payment.succeeded'
              : 'payment.failed',
          eventId: event.id,
          accountId: event.account ?? null,
          reference: data.reference ?? data.metadata?.reference ?? null,
          amountMinor: data.amount ? decimalToMinor(data.amount) : 0,
          currency: data.currency ?? '',
        };
      }
      case 'account.updated':
      case 'capability.updated':
        return event.account
          ? {
              type: 'account.updated',
              eventId: event.id,
              accountId: event.account,
            }
          : null;
      default:
        return null;
    }
  }

  /**
   * HMAC-SHA256 (hex) of "{timestamp}.{raw body}". The V2 header carries one v1= per
   * valid secret, so any match passes: comparing only the first fails during rotation.
   */
  private verifySignature(
    headers: WebhookDelivery['headers'],
    rawBody: Buffer,
  ) {
    let timestamp = header(headers, 'x-bachs-timestamp');
    let signatures = [header(headers, 'x-bachs-signature')];
    const v2 = header(headers, 'x-bachs-signature-v2');
    if (v2) {
      const parts = v2.split(',').map((part) => part.trim().split('='));
      timestamp = parts.find(([key]) => key === 't')?.[1];
      signatures = parts
        .filter(([key]) => key === 'v1')
        .map(([, value]) => value);
    }

    const seconds = Number(timestamp);
    if (!timestamp || !Number.isFinite(seconds)) {
      throw new InvalidWebhookError('missing webhook timestamp');
    }
    const age = Math.abs(this.now().getTime() / 1000 - seconds);
    if (age > WEBHOOK_TOLERANCE_SECONDS) {
      throw new InvalidWebhookError('webhook timestamp is too old');
    }

    const expected = createHmac('sha256', this.config.webhookSecret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest();
    const matches = signatures.some((signature) => {
      if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
      const given = Buffer.from(signature, 'hex');
      return (
        given.length === expected.length && timingSafeEqual(given, expected)
      );
    });
    if (!matches)
      throw new InvalidWebhookError('webhook signature does not match');
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: { body?: unknown; account?: string; idempotencyKey?: string } = {},
  ): Promise<T> {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.account ? { 'X-Account-Id': options.account } : {}),
        ...(options.idempotencyKey
          ? { 'Idempotency-Key': options.idempotencyKey }
          : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error_code?: string;
        detail?: string;
      };
      throw new BachsApiError(
        response.status,
        error.error_code ?? 'UNKNOWN',
        error.detail ?? response.statusText,
      );
    }
    return (await response.json()) as T;
  }
}

function toSchoolAccount(account: BachsAccount): SchoolAccount {
  const due = [
    ...(account.requirements?.past_due ?? []),
    ...(account.requirements?.currently_due ?? []),
  ];
  const restricted =
    (account.requirements?.past_due?.length ?? 0) > 0 ||
    (account.requirements?.errors?.length ?? 0) > 0;
  return {
    accountId: account.id,
    status: restricted
      ? 'restricted'
      : account.is_active && due.length === 0
        ? 'active'
        : 'pending',
    requirementsDue: [...new Set(due)],
  };
}

function header(headers: WebhookDelivery['headers'], name: string) {
  // Node lower-cases incoming header names.
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}
