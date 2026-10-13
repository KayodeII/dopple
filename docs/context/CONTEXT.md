# Project context — handover note

Last updated: 2026-10-13

Read `AGENTS.md` first. This file says where the work stands. Update it at the end of every session.

## Current state

The monorepo is scaffolded. The API boots, resolves schools by host, enforces tenant isolation in Postgres and emits traces, metrics and logs. The marketing site (`apps/site`) is built from the approved design and reads the partner wall from the API. No school-facing product features yet beyond a sample `students` list.

## Done

- pnpm workspace, root scripts, `.editorconfig`, Prettier, oxlint.
- `apps/api` on NestJS 12 (ESM, Vitest, oxlint), strict TypeScript.
- Config: zod-validated environment (`src/config/env.ts`).
- Tenancy: host → school resolution (`src/tenancy`), request context via nestjs-cls, 404 for unknown hosts.
- Database: Drizzle ORM + node-postgres; `tenants` registry and `students` with row-level security; `TenantDb.run()` sets `app.tenant_id` per transaction.
- Observability: OpenTelemetry Node SDK loaded with `--import` (HTTP, Express, Postgres, pino auto-instrumentation); pino JSON logs with `trace_id` and tenant; tenant attributes on spans; `/health/live` and `/health/ready`.
- Tests: unit (`parseHost`), e2e (health, unknown host, tenant isolation, showcase).
- Showcase: `GET /showcase/schools` (platform host, no tenant) lists schools with `tenants.showcase = true` (name, slug, city, logoUrl) for the marketing site's partner logo wall. Opt-in only; cached 5 min.
- Marketing site `apps/site`: Next.js 16 (Cache Components), Tailwind 4, self-hosted fonts, 18 section components matching the design canvas; Playwright smoke tests (desktop + mobile: renders, no console errors, no sideways scroll, FAQ works).
- Auth (ADR 0004): `users` + `refresh_tokens` (RLS, migration 0003), scrypt passwords, Ed25519 JWT access tokens (15 min, `tid` must match host), rotating refresh tokens with reuse detection, `/auth/sign-in|refresh|sign-out|me`, `/.well-known/jwks.json`. Global guard: private unless `@Public()`; `@Roles()` for roles. `/students` is admin/teacher only. Sign-in rate limit per IP (`LOGIN_RATE_LIMIT_PER_MINUTE`, in-memory). Seed adds `admin@<slug>.test` / `teacher@<slug>.test`, password `dopple-demo`.
- School structure (ADR 0005, migration 0004): `academic_sessions` + `terms`, `subjects`, `classes` (per session, optional form teacher), composite `(tenant_id, id)` foreign keys. `/sessions`, `/subjects`, `/classes` (read: signed in, write: admin). Global `DatabaseErrorFilter`: unique → 409, FK/check → 422. Seed adds a demo year, subjects and classes.
- Enrolments and subject teachers (migration 0005): `enrolments` (one class per student per session; re-enrolling moves), `class_subjects` (optional teacher), `students.user_id` (link to a student account). `/classes/:id/students` (staff read, admin write), `/classes/:id/subjects`, `PATCH /students/:id`. Seed enrols demo students and adds `student@<slug>.test`.
- Timetable (ADR 0006, migration 0006): `timetable_slots` per class, term and weekday; overlaps within a class refused by an exclusion constraint (`btree_gist`), teacher double-booking by the service (409). `/classes/:id/timetable`, `/timetable/me`. Seed adds a first-term timetable for JSS 1A.
- Local infra: `infra/docker-compose.yml` (Postgres 17, Redis 7, NATS JetStream, Grafana LGTM).
- Repo rules: PR template with Before/After from the running UI (`apps/site` included), CI (checks, UI evidence, no co-author trailers), commit-msg hook.

## Next up

1. Auth follow-ups: move rate-limit counters to Redis before scaling out, invites + password reset (needs email provider), Google/Microsoft sign-in, expired refresh-token cleanup.
2. Core school records, continued: guardians (parent ↔ student, then parents' `/timetable/me`), adding/editing students through the API, and re-checking teacher clashes when a subject's teacher changes.
3. `apps/web`: React portal shell (student home from the design canvas).
   - Site follow-ups: real pricing, demo-booking form backend (currently `action="#demo"`), legal pages, analytics.
4. `services/realtime`: Go WebSocket gateway skeleton with NATS.
5. Fees: payment provider subaccounts, webhook ledger (see architecture doc, "Fee payments").

## Coming soon (announced on the website)

- **Pay small small:** parents spread a term's fees into smaller instalments. Not built yet; see `docs/roadmap.md` for scope and open questions (plan vs. financed credit).

## Open questions

- Admin UI for a school to opt in to the partner wall and upload its logo (where are logos stored: S3/R2 under the tenant prefix?).
- Email provider for invites and password resets (Postmark, SES, Resend?).
- Google/Microsoft sign-in: one platform OAuth app, or schools bring their own Workspace/Entra tenant?
- Desktop framework: Electron or Tauri?
- Payment provider: Paystack, Flutterwave or both?
- Launch region and data-residency promises.
- Cloud provider (AWS + Cloudflare?).

## Key references

- Architecture overview (Claude doc): https://claude.ai/code/artifact/bd7488b4-c632-49d5-aae1-6a5e88965ff9
- Website and portal designs (canvas): https://claude.ai/code/artifact/f45b09ad-3e6b-44ca-8bb6-033d7ca1bcd3
- Stack decisions: `docs/decisions/0001-tech-stack.md`

## Session log

Newest first. One or two lines each.

- 2026-10-13 — Added the timetable (migration 0006). drizzle-kit again put an FK before its unique constraint, and cannot write exclusion constraints: both fixed by hand in 0006 before applying; verified on a fresh database. Branch is stacked on PR #5.
- 2026-10-12 — Added enrolments, subject teachers per class and student ↔ account linking (migration 0005). drizzle-kit put a foreign key before the unique constraint it needs; reordered by hand before applying. `assertActiveUser` now lives in `src/common`.
- 2026-10-11 — Added school structure: sessions/terms, subjects, classes (ADR 0005, migration 0004) and `DatabaseErrorFilter`. New rule in AGENTS.md: composite foreign keys between tenant tables. Tenant-isolation test covers the new tables.
- 2026-10-11 — Rewrote `README.md`: architecture diagram (mermaid), request path, auth summary, layout, Docker and no-Docker setup, env and endpoint tables. `scripts/start-dopple.command` still prints an unauthenticated `/students` example (now 401) and kills whatever is on :3000/:3100.
- 2026-10-11 — Added per-IP sign-in rate limit (`@nestjs/throttler`, in-memory). Guards run before validation, so every POST to `/auth/sign-in` counts. e2e config raises the limit to 1000; `test/sign-in-rate-limit.e2e-spec.ts` sets its own.
- 2026-10-11 — "Pay small small" (fee instalments) is noted as coming soon in `docs/roadmap.md`, and the site's fees card + FAQ.
- 2026-10-11 — Tightened UI PR evidence: `apps/site` included; Before/After must be screenshots of the running UI on the branch (not AI/mock images); "New screen" only valid under Before.
- 2026-10-11 — Added email/password auth (ADR 0004, migration 0003). Verified `pnpm check` + all e2e. Every route now needs a bearer token unless `@Public()`: new modules must decide. Docker was not installed here, so the API ran on Homebrew Postgres, on port 3002 (3000 was taken), with OTel exporters off.
- 2026-10-11 — Built `apps/site` (marketing site) from the design canvas; verified lint, types, build, desktop + mobile screenshots and Playwright smoke tests. Partner wall hidden until 6 schools opt in.
- 2026-10-11 — Added tenant showcase fields (migration 0002) and `GET /showcase/schools` for the website's partner wall; seed opts in the two demo schools.
- 2026-10-11 — Initial scaffold. Verified: lint, typecheck, unit + e2e tests, build, live boot against Postgres with console trace exporter.
