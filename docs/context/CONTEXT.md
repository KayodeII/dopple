# Project context — handover note

Last updated: 2026-10-18

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
- Student records: `POST /students`, `GET /students/:id` (with class per session), `PATCH /students/:id` (any field), `?q=` search. Changing a subject's teacher re-checks timetable clashes.
- Browser sessions (ADR 0008): `X-Dopple-Session: cookie` puts the refresh token in an HttpOnly `__Host-dopple_refresh` cookie (SameSite=Strict) instead of the body; refresh/sign-out read it; the header doubles as the CSRF defence.
- School web app `apps/web` (ADR 0009): Vite + React Router + TanStack Query SPA at `<slug>.dopple.localhost:3200`, `/api` proxied with the Host header kept. Sign-in with cookie sessions, role-based shell from the design canvas, home with today's lessons, my timetable, students (search, add, edit), classes (timetable add/remove, enrol/remove students, subjects). Public `GET /school` for the sign-in page. Playwright tests against the seeded school; CI seeds the database.
- Self-serve schools and branding (ADR 0010, migration 0007): `POST /schools` (sign-up via `create_school()`), `GET /schools?q=` (find your school), `/schools/availability`; `tenants.brand_color`, `school_logos` (Postgres, PNG/JPEG/WebP ≤200 KB, public read); `PATCH /school`, `/school/logo`. Web app themes itself per school and has School settings for admins. Seed gives Riverside a blue.
- Website log-in and sign-up: header **Log in** → `/login` (find your school, keyboard combobox, then the school's sign-in page); `/start` (self-serve sign-up with live address check, server action → `POST /schools` → redirect to the new school's sign-in). Fixed the hero covering the header links.
- Web app themes: light is the default, dark or "match my device" per person in Settings (now open to every role; school name/colour/logo stay admin-only). Theme colours are role-named tokens (`fg`, `fg-2`, `fg-3`, `raised`, `edge-2`, `warn`, …) set per `[data-theme]`. Sign-in redesigned: school colour panel with name, logo and the Dopple circles, form on the right, "Powered by dopple" footer.
- Two school colours (migration 0008): optional `accent_color` beside `brand_color`, set in Settings; the web app paints it on the sign-in panel, the selected menu item and a stripe across the top. Seed gives Riverside blue + gold.
- Research: `docs/research/nigeria-education.md` (structure nursery to SS 3, 2025 curriculum, every external exam, out-of-school children, data cost, children's data law). Read it before product work.
- Dopple Learn v1 (ADR 0011, migration 0009): platform-wide `learn_subjects` / `learn_topics` / `learn_questions` (app role read-only), content in `content/learn/` loaded by `pnpm learn:load`, public `GET /learn`, `/learn/classes/:slug`, `/learn/topics/:slug`. Website `/learn` (pick a class, exams guide), `/learn/<class>`, `/learn/<class>/<lesson>` with practice (best score in browser storage only). "Learn free" in the site header. 5 starter lessons (Nursery 2, P2, P4, JSS 1, SS 1).
- Local infra: `infra/docker-compose.yml` (Postgres 17, Redis 7, NATS JetStream, Grafana LGTM).
- Repo rules: PR template with Before/After from the running UI (`apps/site` included), CI (checks, UI evidence, no co-author trailers), commit-msg hook.

## Next up

0. **Dopple Learn, next:** more lessons (English and Mathematics for every class first; needs teachers to write and review), offline (service worker), CBT-style timed mock exams, exam guides for private candidates, placement ("where do I start?"), optional accounts with parent consent. **Proctored exams are a requirement** for exams that count (school CBT, scored mocks); see `docs/roadmap.md`, needs its own ADR first.
1. Auth follow-ups: move rate-limit counters to Redis before scaling out, invites + password reset (needs email provider), Google/Microsoft sign-in, expired refresh-token cleanup.
2. Core school records, continued: guardians (parent ↔ student, then parents' `/timetable/me`). Students leaving (status instead of deleting) and list paging when schools get large.
3. `apps/web` next: assign subject teachers (needs a staff list endpoint), create sessions/classes/subjects from the UI, parent view after guardians, school colour per tenant, a shared `packages/ui` for tokens. `scripts/start-dopple.command` should also start `dev:web`.
   - Site follow-ups: real pricing, demo-booking form backend (currently `action="#demo"`), legal pages, analytics.
4. `services/realtime`: Go WebSocket gateway skeleton with NATS.
5. Fees: payment provider subaccounts, webhook ledger (see architecture doc, "Fee payments").

## Coming soon (announced on the website)

- **Pay small small:** parents spread a term's fees into smaller instalments. Not built yet; see `docs/roadmap.md` for scope and open questions (plan vs. financed credit).

## Open questions

- Who writes and reviews Learn content (paid teachers, volunteer teachers, partner schools)? Licence past questions from WAEC/NECO/JAMB, or only write our own?
- Zero-rated data for `/learn` with a mobile network (as Airtel does for the Nigeria Learning Passport)?
- Proctoring: camera snapshots of under-18s need parental consent and a retention limit under the NDPA; lab kiosk mode vs phones.

- Admin UI for a school to opt in to the partner wall (logos are now uploaded in School settings and stored in Postgres, ADR 0010; move to S3/R2 when uploads grow).
- Sign-up abuse: CAPTCHA or review queue for self-serve schools? Email verification needs the email provider.
- Email provider for invites and password resets (Postmark, SES, Resend?).
- Google/Microsoft sign-in: one platform OAuth app, or schools bring their own Workspace/Entra tenant?
- Payment provider: Paystack, Flutterwave or both?
- Launch region and data-residency promises.
- Cloud provider (AWS + Cloudflare?).

## Key references

- Architecture overview (Claude doc): https://claude.ai/code/artifact/bd7488b4-c632-49d5-aae1-6a5e88965ff9
- Website and portal designs (canvas): https://claude.ai/code/artifact/f45b09ad-3e6b-44ca-8bb6-033d7ca1bcd3
- Stack decisions: `docs/decisions/0001-tech-stack.md`

## Session log

Newest first. One or two lines each.

- 2026-10-18 — Redesigned the lesson page (branch `lesson-look`, on #16): subject-coloured cover, numbered steps with a lesson map, worked examples revealed step by step, sticky-note tips, and read-aloud (browser speech, no data). Subject colours and glyphs live in `apps/site/src/lib/lesson-look.ts`.
- 2026-10-18 — Researched Nigeria's school system and exams; built Dopple Learn v1 (branch `learn`, stacked on PR #15, which lands #11–#14 on `main`: those had merged into their parent branches, not `main`). `scripts/learn-load.mjs` imports `src/modules/learn/content.ts` directly via Node type stripping, so keep that file free of relative imports. CI loads Learn content and rebuilds the site after the API starts. The user asked for proctored exams: recorded in ADR 0011 and the roadmap, not built yet.

- 2026-10-15 — Accent colour (branch `school-colours`, stacked on #13). Migration 0008 drops and recreates `update_school_profile()` with a third argument (hand-written after the generated part). Settings' hex fields are now labelled "Main colour hex" / "Accent colour hex".
- 2026-10-15 — Light/dark themes and new sign-in page (branch `web-themes`, stacked on PR #12). Token renames in `apps/web`: paper→`fg`, sand→`fg-2`, soft→`fg-3`, graphite→`raised`, iron→`edge-2`; `paper`/`ink`/`sun` are fixed colours. Theme choice is localStorage only (per device); `index.html` paints it before React loads. Settings warns if a school colour vanishes on either background.
- 2026-10-14 — Website `/login` and `/start`. The hero's content layer (z-20) was covering the header, so no header link could be clicked; the header is now z-30. Site e2e creates one `Playwright Prep …` school per run (local DBs accumulate them; CI's is fresh).
- 2026-10-14 — Self-serve sign-up and branding (ADR 0010). Migration 0007 adds two hand-written SECURITY DEFINER functions after the generated part. New env `SCHOOL_URL_FORMAT` (set `http://{host}:3200` locally) and `SCHOOL_SIGNUPS_PER_HOUR`. Website pages for find-your-school and sign-up come in a separate PR.
- 2026-10-14 — Built `apps/web` v1 (ADR 0009). Node minimum is now 22.22 (React Router 8). Web e2e tests sign in ~5 times per run (API default limit 10/min): running them twice within a minute locally can hit 429. They add an `E2E-…` student to Greenfield each run.
- 2026-10-14 — Students can be added, edited, searched and read one at a time; responses no longer include `tenantId`/`createdAt`. Timetable lesson query and teacher-clash check moved to `timetable/lessons.ts` so `ClassSubjectsService` reuses it.
- 2026-10-14 — Refresh token can live in an HttpOnly cookie for the web app (ADR 0008). Don't enable CORS for `X-Dopple-Session` from other origins: that header is the CSRF defence. `/auth/sign-out` no longer needs a body.
- 2026-10-13 — Dropped the desktop app for now: everything, staff screens included, goes in `apps/web` (ADR 0007). Removed `apps/desktop` and its CI path. The architecture doc artifact still shows a desktop client.
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
