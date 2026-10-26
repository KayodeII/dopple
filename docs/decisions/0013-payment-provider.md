# 0013 — Bachs for fees

- Status: accepted
- Date: 2026-10-24

## Context

Fees must settle to each school's own bank account, with a per-school ledger reconciled daily
(`docs/architecture.md`). We needed a provider with a platform model: one Dopple integration,
many schools each paid directly. We had been weighing Paystack and Flutterwave.

## Decision

Use [Bachs](https://bachs.io) (docs: https://docs.bachs.io), through its Connect product:

- Each school is a Bachs connected account (`acct_...`), created and verified (KYC) when the
  school turns on fees. We store the account id on the tenant; the school's bank details stay
  with Bachs.
- Fee payments are **direct charges**: we create the checkout with the `X-Account-Id` header, so
  the school is the merchant of record and the money lands in its own balance. Refunds and
  disputes debit the school's balance, not Dopple's.
- Dopple's cut, if any, is a `platform_fee` on the charge, never a transfer we make by hand.
- Webhooks (for example `collection.succeeded`) are the source of truth for a paid fee. We verify
  the signature, store the event id, and process each event once.

Bachs is the provider to start with, not forever. So everything goes through one adapter
interface, `PaymentProvider` (`apps/api/src/modules/payments/payment-provider.ts`): school
accounts, checkouts and verified, translated webhook events, with money in kobo. Fees and the
ledger only ever see that interface. `PAYMENT_PROVIDER` picks the adapter (`bachs`, or `fake`
for local runs and tests). Switching provider is one new adapter plus a change of that setting
and its keys.

## Consequences

- One integration instead of two. Bachs also offers subscriptions and virtual accounts, which may
  fit "Pay small small" instalments (`docs/roadmap.md`).
- `BACHS_SECRET_KEY` picks the host by its prefix (`sk_sandbox_` or `sk_live_`), so moving from
  sandbox to live is a key change. Production refuses to start with the fake provider.
- The ledger stores the provider name with every account id and payment, so a school that
  moves provider keeps its history.
- To confirm with Bachs before launch, because the docs do not say: its licence in Nigeria (CBN)
  and the processor behind it; which Nigerian methods work for collections (bank transfer, USSD,
  cards in NGN); payout timing to Nigerian banks; and pricing.
- A young provider is a concentration risk. If it falls short, a Paystack or Flutterwave adapter
  replaces it behind the same interface.
