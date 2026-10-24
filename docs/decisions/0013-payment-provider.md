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

The integration lives in one `fees` module behind a small interface, so the provider can change
without touching the ledger.

## Consequences

- One integration instead of two. Bachs also offers subscriptions and virtual accounts, which may
  fit "Pay small small" instalments (`docs/roadmap.md`).
- New environment variables (`BACHS_SECRET_KEY`, webhook secret) go in `src/config/env.ts` and
  `.env.example` with the first fees PR. Build against the Bachs sandbox.
- To confirm with Bachs before launch, because the docs do not say: its licence in Nigeria (CBN)
  and the processor behind it; which Nigerian methods work for collections (bank transfer, USSD,
  cards in NGN); payout timing to Nigerian banks; and pricing.
- A young provider is a concentration risk. If it falls short, Paystack or Flutterwave subaccounts
  can replace it behind the same interface.
