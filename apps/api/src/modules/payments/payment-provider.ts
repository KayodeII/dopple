import { Inject } from '@nestjs/common';

/**
 * The only way Dopple talks to a payment provider (ADR 0013). Fees, the ledger and
 * webhooks use this interface and never a provider's own types, so switching provider
 * means writing one adapter and changing PAYMENT_PROVIDER and its keys.
 *
 * Money is always an integer in minor units (kobo for NGN). Adapters convert.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;

  /** A school's own account with the provider, so fees settle to the school. */
  createSchoolAccount(input: NewSchoolAccount): Promise<SchoolAccount>;
  getSchoolAccount(accountId: string): Promise<SchoolAccount>;

  /** A hosted payment page; the money lands in the school's balance, not Dopple's. */
  createCheckout(input: NewCheckout): Promise<Checkout>;

  /**
   * Verifies a webhook delivery and translates it. Throws InvalidWebhookError if the
   * signature or timestamp is wrong. Returns null for events Dopple does not use.
   */
  parseWebhook(delivery: WebhookDelivery): PaymentEvent | null;
}

export const paymentProviderNames = ['fake', 'bachs'] as const;
export type PaymentProviderName = (typeof paymentProviderNames)[number];

export type Currency = 'NGN';

export interface NewSchoolAccount {
  schoolName: string;
  contactEmail: string;
}

export interface SchoolAccount {
  accountId: string;
  /** `active` once the provider has verified the school and it can take payments. */
  status: 'pending' | 'active' | 'restricted';
  /** What the provider still needs from the school before it can be active. */
  requirementsDue: string[];
}

export interface NewCheckout {
  accountId: string;
  amountMinor: number;
  currency: Currency;
  /** Dopple's own reference, echoed back on the payment event. Also the idempotency key. */
  reference: string;
  payerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** Dopple's cut, taken by the provider from the school's proceeds. */
  platformFeeMinor?: number;
}

export interface Checkout {
  checkoutId: string;
  url: string;
}

export interface WebhookDelivery {
  headers: Record<string, string | string[] | undefined>;
  /** The body exactly as received: re-serialised JSON breaks the signature. */
  rawBody: Buffer;
}

export type PaymentEvent =
  | {
      type: 'payment.succeeded' | 'payment.failed';
      /** Provider's event id: deliveries repeat, so process each id once. */
      eventId: string;
      accountId: string | null;
      reference: string | null;
      amountMinor: number;
      currency: string;
    }
  | {
      type: 'account.updated';
      eventId: string;
      accountId: string;
    };

export class InvalidWebhookError extends Error {}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/** `constructor(@InjectPaymentProvider() payments: PaymentProvider)`. */
export const InjectPaymentProvider = () => Inject(PAYMENT_PROVIDER);

/** 12345 → "123.45". Integer maths only: floats lose kobo. */
export function minorToDecimal(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError(
      `amount must be a whole number of minor units: ${minor}`,
    );
  }
  return `${Math.trunc(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}

/** "123.45" → 12345. */
export function decimalToMinor(decimal: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(decimal);
  if (!match) throw new RangeError(`not a money amount: ${decimal}`);
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}
