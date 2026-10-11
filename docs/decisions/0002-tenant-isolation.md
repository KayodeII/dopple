# 0002 — Tenant isolation with Postgres row-level security

- Status: accepted
- Date: 2026-10-11

## Context

Most schools share one database (pooled tier). A single missing `WHERE tenant_id = …` must not leak one school's data to another, especially children's data.

## Decision

- Every tenant-owned table has `tenant_id` first in its primary key and a row-level security policy comparing it to `current_setting('app.tenant_id')`.
- The API connects as `dopple_app`, which is neither a superuser nor the table owner, so the policy always applies.
- `TenantDb.run()` opens a transaction and sets `app.tenant_id` with `set_config(..., true)` (transaction-local, safe with connection pooling).
- With no tenant set, policies return no rows rather than erroring.
- The tenant comes only from the request host (later: the edge's signed header), never from user input.

## Consequences

- Tenant queries must run inside a transaction (one extra round trip for `set_config`).
- Migrations and the seed script run as the owner role (`MIGRATION_DATABASE_URL`).
- `test/tenant-isolation.e2e-spec.ts` must keep passing; extend it when adding tenant tables.
