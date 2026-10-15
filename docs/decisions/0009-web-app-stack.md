# 0009 — School web app: Vite, React Router and TanStack Query

- Status: accepted
- Date: 2026-10-14

## Context

`apps/web` is the one client for every role (ADR 0007). It lives behind sign-in, on each school's own address, and talks to the API with an in-memory access token plus the HttpOnly refresh cookie (ADR 0008). There is nothing to render on a server: no public pages, no SEO, and per-user data on every screen. The marketing site already uses Next.js, where server rendering does pay.

## Decision

- **A single-page app built with Vite**, React 19 and **React Router** (data mode: `createBrowserRouter`). No server rendering. Static files can be served from the edge or a CDN.
- **TanStack Query** for server data: caching, refetching and "refresh what this write changed" (`useWrite` in `src/lib/queries.ts` invalidates by query-key prefix).
- **Same origin:** the app calls `/api/...` on its own host. The Vite dev and preview servers proxy that to the API with the `Host` header untouched, so the API still resolves the school; in production the edge routes it. No CORS, and the refresh cookie stays first-party.
- **Sessions** (`src/lib/api.ts`): the access token is kept in memory only, never in `localStorage`. On page load the app calls `/auth/refresh` with the cookie. A 401 triggers one renewal and a retry. Refreshes are serialised in the tab and, through the Web Locks API, across tabs, because two refreshes with the same single-use cookie would look like token theft and end the session.
- **Styling:** Tailwind 4 with design tokens in `src/styles.css`, copied from the site plus the portal colours from the design canvas, until a shared `packages/ui` exists.
- **Tests:** Vitest for logic in `src/lib`; Playwright end-to-end against the running API and the seeded demo school.

## Consequences

- One more dev server: `pnpm dev:web` on port 3200, opened at `<slug>.dopple.localhost:3200`. `DOPPLE_API_URL` points its proxy at the API.
- On first load with no session, the browser logs a 401 from the refresh check in the console. That's expected: it's how the app learns nobody is signed in.
- The tokens are duplicated between `apps/site` and `apps/web` for now.
- Schools cannot set their own colour yet; `--color-school` is one default.
