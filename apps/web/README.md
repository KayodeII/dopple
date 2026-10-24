# apps/web — school web app

One React app for everyone at a school: admins, teachers, students and parents. It is served on each school's own address, and the screens depend on the signed-in user's role. There is no desktop app (ADR 0007). Stack and reasons: ADR 0009.

## Run it

```bash
pnpm dev                 # the API (port 3000; use PORT=… and DOPPLE_API_URL below if taken)
pnpm dev:web             # this app on port 3200
```

Open http://greenfield.dopple.localhost:3200 in Chrome. Demo accounts: `admin@`, `teacher@` or `student@greenfield.test`, password `dopple-demo`.

The dev server proxies `/api/*` to the API (`DOPPLE_API_URL`, default `http://localhost:3000`) and keeps the `Host` header, so the API knows which school is asking.

## What's here

| Path | |
| --- | --- |
| `src/lib/api.ts` | API client and session: in-memory access token, HttpOnly refresh cookie (ADR 0008), one renewal on 401 |
| `src/lib/session.tsx` | Session context: signed in, signed out or loading |
| `src/lib/queries.ts` | TanStack Query hooks per resource, and `useWrite` for changes |
| `src/router.tsx` | Routes; signed-out visitors go to `/sign-in?next=…`, staff pages show "Staff only" to others |
| `src/components/Shell.tsx` | Sidebar layout from the design canvas |
| `src/pages/` | Sign-in, home, my timetable, students, student, classes, class, school settings (admins: name, colour, logo) |
| `src/components/SchoolTheme.tsx` | Applies the school's colour (`--color-school`, readable `--color-on-school`) and shows its logo |
| `e2e/` | Playwright tests against the running API and seeded demo school |

## Test

```bash
pnpm --filter @dopple/web test        # unit tests (src/lib)
pnpm --filter @dopple/web test:e2e    # needs the API and `pnpm db:seed`; reuses pnpm dev:web if running
```

Any PR touching this folder needs Before and After screenshots of the running UI on that branch (see `AGENTS.md`). AI-generated images do not count.
