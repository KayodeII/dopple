# AGENTS.md — start here

This file is for any agent (Claude, Codex, Copilot, Cursor) or person picking up work on Dopple.
Read it fully before changing anything, then read `docs/context/CONTEXT.md` for where the work stands.

## What Dopple is

A multi-tenant school management platform. Each school is a tenant with:

- a **web app** on the school's own address (`<slug>.dopple.school` or a custom domain) for everyone: admins, teachers, students and parents. Each role sees its own screens. There is no desktop app for now (ADR 0007),
- **Dopple Learn** (ADR 0011): free lessons and exam practice at `/learn` for anyone, school or
  not, aimed at the millions of Nigerian children who can't afford school but can get online,
- live video classes, a shared whiteboard, recorded lessons, exams (CBT), ID cards, bus tracking, events, attendance, grades and fee payments that settle to the school's own bank account.

Architecture: `docs/architecture.md`. Decisions and their reasons: `docs/decisions/`.

## Repository map

| Path | What lives there | Status |
| --- | --- | --- |
| `apps/api` | NestJS 12 API (TypeScript, ESM): tenancy, school records, exams, fees | Scaffolded |
| `apps/site` | Marketing website (Next.js 16, Tailwind 4). Copy lives in `src/lib/content.ts` | Built (v1) |
| `apps/web` | School web app (Vite, React, React Router) for staff, students and parents | Built (v1: sign-in, students, classes, timetables) |
| `services/realtime` | Go WebSocket gateway: whiteboard sync, chat, presence | Planned |
| `content/learn` | Dopple Learn lessons and practice questions (JSON), loaded with `pnpm learn:load` | Started (32 lessons: English and maths in every class) |
| `infra` | Local dependencies (Postgres, Redis, NATS, Grafana LGTM) | Ready |
| `docs/context` | Living project state for agents. **Update it every session.** | Ready |
| `docs/decisions` | Architecture decision records (ADRs) | Ready |
| `docs/research` | Background research, e.g. Nigeria's school system and exams. Read before product work | Ready |
| `docs/roadmap.md` | Features announced as "coming soon"; keep in step with the website copy | Ready |

## Commands

Run from the repo root. Requires Node 22.22+ and pnpm (`corepack enable`).

```bash
pnpm install
pnpm infra:up                         # Postgres, Redis, NATS, Grafana (needs Docker)
cp apps/api/.env.example apps/api/.env
pnpm db:migrate                       # apply migrations as the owner role
pnpm db:seed                          # two demo schools: greenfield, riverside
pnpm learn:load                       # Dopple Learn content from content/learn (run after edits)
pnpm dev                              # API on http://localhost:3000 with watch
pnpm dev:site                         # marketing site on http://localhost:3100
pnpm dev:web                          # school web app on http://greenfield.dopple.localhost:3200

curl -H "Host: greenfield.dopple.localhost" localhost:3000/students

pnpm check                            # lint + typecheck + unit tests + build. Run before every PR.
pnpm test:e2e                         # needs a migrated database
```

Grafana (traces, metrics, logs): http://localhost:3001, user `admin`, password `admin`.

## Rules that are not optional

### Tenant isolation

1. Every tenant-owned table has `tenant_id` as the first column of its primary key, row-level security enabled, and the `tenantIsolation` policy. Copy the `students` table in `apps/api/src/database/schema.ts`.
   References between tenant-owned tables are composite foreign keys, `(tenant_id, x_id) → (tenant_id, id)` (see `classes` and ADR 0005).
2. Read and write tenant-owned tables **only** through `TenantDb.run()`. Never query them with the raw `DB` client.
3. Never accept a tenant id from request input (body, query, headers other than the host). The tenant comes from `TenantMiddleware`.
4. The API connects as `dopple_app`, which is not a superuser and not the table owner. Do not change that; superusers bypass row-level security.
5. A change that touches tenancy needs a test in `apps/api/test/tenant-isolation.e2e-spec.ts`.
6. The app role never writes `tenants` directly. New schools go through `create_school()` and name/colour changes through `update_school_profile()` (ADR 0010).
7. `school_logos` is the one tenant table readable across schools (logos are public). Always filter it by `tenant_id` when reading.

### Code

- One folder per feature under `apps/api/src/modules/<feature>`: `*.module.ts`, `*.controller.ts` (HTTP only), `*.service.ts` (logic), `*.spec.ts`. `students` is the reference.
- ESM: relative imports end in `.js` (`import { X } from './x.js'`).
- Outside services (payments, and email next) go through an adapter interface picked by an
  environment variable, with a `fake` adapter for local runs and tests. Never call a provider's
  API from a feature module. `modules/payments` is the reference (ADR 0013).
- New environment variables go in `apps/api/src/config/env.ts` (validated with zod) **and** `.env.example`.
- Schema changes: edit `schema.ts`, then `pnpm --filter @dopple/api db:generate`. Never edit an applied migration; add a new one.
- Observability is automatic for HTTP, Postgres and logs. Add a custom metric in `src/observability/metrics.ts` only for business events (fees paid, exams started).
- Log with the Nest `Logger` or the injected pino logger, never `console.log`. Never log personal data about students.
- Comments explain *why*, not *what*. Keep functions small and names plain.

### Marketing site (`apps/site`)

- Next.js 16 changed a lot: read `apps/site/node_modules/next/dist/docs/` before using an API you think you know. Cache Components is on, so time- or request-dependent values need `'use cache'` + `cacheLife()` or a `<Suspense>` boundary.
- All copy is in `src/lib/content.ts`, photos (with credits) in `src/lib/photos.ts`, one component per section in `src/components/sections`.
- Use the design tokens from `src/app/globals.css` (`bg-paper`, `text-ink`, `bg-sun`, `font-display`, …), not raw hex values.
- Never invent testimonials, stats or partner logos. The partner wall only shows schools from `GET /showcase/schools` and hides below `SHOWCASE_MIN_SCHOOLS`.
- Every animation must stop under `prefers-reduced-motion` (handled globally in `globals.css`; keep it that way).
- **Log in** goes to `/login` (find your school, then that school's own sign-in page); `/start` is self-serve sign-up (ADR 0010). Both reach the API only server-side: route handlers in `src/app/api/schools` and the server action in `src/app/start/actions.ts`, using `DOPPLE_API_URL`.
- Smoke tests: `pnpm --filter @dopple/site build && pnpm --filter @dopple/site test:e2e` (set `CHROMIUM_PATH` to reuse an installed Chromium).

### School web app (`apps/web`)

- Stack and reasons: ADR 0009. React Router in data mode (`createBrowserRouter` in `src/router.tsx`), server data through TanStack Query hooks in `src/lib/queries.ts`.
- Call the API only through `api()` in `src/lib/api.ts`, at `/api/...` on the same origin. Never store tokens in `localStorage` or `sessionStorage`: the access token stays in memory and the refresh token is an HttpOnly cookie (ADR 0008).
- Show the API's error message with `<ErrorNote>`; it already says what went wrong ("This overlaps an existing record").
- Use the design tokens in `src/styles.css` (`bg-card`, `bg-school`, `text-soft`, …), not raw hex values. Every page must work at phone width.
- Imports are extensionless here (bundler resolution), unlike the API.
- End-to-end tests in `e2e/` run against the API and the seeded demo school: `pnpm --filter @dopple/web test:e2e` (reuses `pnpm dev:web` if it is running). Each role signs in once per run; keep it that way, the API allows 10 sign-ins a minute by default.

### Commits and pull requests

- **No co-author trailers.** Commit messages must not contain `Co-authored-by:` lines (or any other AI-attribution trailer). A git hook (`.githooks/commit-msg`) and CI both reject them. Do not bypass the hook.
- Commit messages: imperative summary under 72 characters (`Add fee payment webhooks`), blank line, then why.
- One logical change per PR. Fill in `.github/pull_request_template.md`.
- **Any PR that changes UI must include Before and After screenshots (or a short video) of the running UI built from that branch** in the PR description — browser or Playwright captures, not AI-generated images, Figma exports, or mocks. CI fails a PR that touches `apps/site`, `apps/web` or `packages/ui` without media under both headings. For a brand-new screen, write "New screen" under Before (After still needs a real screenshot).
- `pnpm check` must pass before opening a PR.

## Session protocol for agents

1. **Start:** read this file and `docs/context/CONTEXT.md`. Check "Next up" and "Open questions".
2. **Work:** follow the rules above. If you make an architectural choice, add an ADR in `docs/decisions/` (copy `0000-template.md`).
3. **Finish:** update `docs/context/CONTEXT.md`:
   - move finished items to "Done", update "Next up",
   - add a line to the session log (date, what changed, anything the next agent must know),
   - record new open questions instead of guessing.

Keep `CONTEXT.md` short and current; it is a handover note, not a diary. Git history holds the detail.
