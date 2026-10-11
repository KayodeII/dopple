# Architecture (summary)

The full overview, with diagrams, lives in the architecture doc:
https://claude.ai/code/artifact/bd7488b4-c632-49d5-aae1-6a5e88965ff9

## In one page

- **Cells.** The platform runs as cells: complete copies of the stack in one region, each serving ~500–1,000 schools. A failure or bad deploy stays inside one cell.
- **Tenancy tiers.** Pooled (shared database, row-level security) → bridged (own database) → silo (own cell and keys). Same code in every tier.
- **Request path.** Edge resolves host → tenant → cell. Inside the cell, the API gateway checks the token's tenant matches the host. Postgres row-level security is the last line of defence.
- **Real-time.** Video on an SFU fleet (LiveKit); whiteboard (Yjs CRDT), chat and presence on a Go WebSocket gateway with NATS. Never through the API servers.
- **Data.** Postgres is the system of record. Redis for cache, sessions, rate limits, presence. NATS for messaging; Kafka/Redpanda later for change data capture and analytics into ClickHouse.
- **Load shape.** Traffic arrives with the school bell. Capacity is scaled ahead of time from timetables.
- **School operations.** Exams pre-load encrypted papers and release the key at start time. ID cards carry signed, revocable QR tokens. Bus GPS goes through a small ingest service into Redis. Fees settle to each school's own account through provider subaccounts, with a per-school ledger reconciled daily.

## How `apps/api` maps to this

| Concern | Where |
| --- | --- |
| Host → tenant | `src/tenancy/parse-host.ts`, `tenant-registry.service.ts`, `tenant.middleware.ts` |
| Request context | nestjs-cls, key `TENANT_KEY` |
| Tenant-scoped queries | `src/database/tenant-db.service.ts` |
| Row-level security policies | `src/database/schema.ts` → `drizzle/*.sql` |
| Traces and metrics | `src/instrumentation.ts`, `src/observability/metrics.ts` |
| Logs | `src/observability/logger.module.ts` |
| Health | `src/health` |
