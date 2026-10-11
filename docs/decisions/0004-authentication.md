# 0004 — Per-school sign-in with short access tokens

- Status: accepted
- Date: 2026-10-11

## Context

Every school is a tenant with its own address. Users (staff, students, parents) belong to one school, and the same email can exist at two schools as two unrelated accounts. The API, the web portal, the desktop app and the Go realtime gateway all need to know who is calling and for which school.

## Decision

- **Accounts are tenant-owned.** `users` and `refresh_tokens` follow the tenant-isolation rules (ADR 0002). Sign-in happens on the school's host, so the lookup is already scoped by row-level security.
- **Passwords:** scrypt from `node:crypto` (N=2^15, r=8, p=1), parameters stored in the hash. No native dependency. Unknown emails still pay the hashing cost, and every failure returns the same message.
- **Access tokens:** JWT signed with Ed25519 (`jose`), 15 minutes. Claims: `sub` (user), `tid` (school), `role`. The public key is at `/.well-known/jwks.json` so other services verify without being able to mint tokens.
- **The token must match the host.** A global guard rejects a token whose `tid` differs from the school resolved from the host.
- **Refresh tokens:** opaque random strings, only their SHA-256 stored, 30 days, single use. Presenting a used one revokes every session of that user. Signing out deletes the row so it never looks like reuse.
- **Private by default.** The guard is global; routes opt out with `@Public()` and restrict with `@Roles()`.

## Consequences

- Disabling a user takes effect within one access-token lifetime (15 minutes), not instantly.
- Production must set `JWT_PRIVATE_KEY`; locally a throwaway key is generated, so tokens die when the API restarts.
- Key rotation needs a second key in the JWKS (the `kid` is already set); not built yet.
- Sign-in is limited per client IP (`LOGIN_RATE_LIMIT_PER_MINUTE`, default 10; refresh gets 3x) with `@nestjs/throttler`. Counters are in memory, which is only correct for one API instance: move them to Redis before running more than one.
- Not yet done: shared (Redis) rate-limit counters, Google/Microsoft sign-in (needs OAuth apps per environment), password reset and invites, cleanup of expired refresh-token rows.
