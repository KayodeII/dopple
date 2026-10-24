# 0012 — Resend for email

- Status: accepted
- Date: 2026-10-24

## Context

Invites, password resets and sign-up email verification all need to send email. We had narrowed
the choice to Postmark, Amazon SES and Resend.

## Decision

Send all transactional email through Resend, using its HTTP API from the NestJS API. Only the
API sends email; the web app and the website never call Resend directly.

## Consequences

- Invites, password resets and email verification for self-serve schools are no longer blocked.
- New environment variables (`RESEND_API_KEY`, a sender address) go in `src/config/env.ts` and
  `.env.example` when the first email feature lands. Tests and local runs need a fake sender, so
  nothing reaches a real inbox.
- We must verify the sending domain (SPF, DKIM) before launch.
- Emails must not carry personal data about students beyond what the recipient already has.
