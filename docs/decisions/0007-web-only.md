# 0007 — Web only: no desktop app for now

- Status: accepted
- Date: 2026-10-13

## Context

The plan had two clients: a desktop app for admins and teachers (Electron or Tauri, undecided) and a web portal for students and parents. Two apps means building, signing, updating and supporting every staff screen twice over, before any school has used either. Everything staff need works in a browser: records and timetables are forms and tables, live classes run on WebRTC (LiveKit has a web SDK), and the whiteboard uses WebSockets.

## Decision

- One web app, `apps/web`, on each school's address (`<slug>.dopple.school` or a custom domain), for admins, teachers, students and parents. Screens depend on the signed-in user's role.
- No `apps/desktop`. The "Electron or Tauri" question is closed for now.
- If a browser limit becomes a real problem, try a progressive web app (installable, offline cache) first, then reopen the desktop question with a new ADR. Likely triggers: offline attendance on poor connections, a locked-down exam mode for CBT, or direct printing of ID cards.

## Consequences

- Staff sign in at their school's own address, so the desktop plan's "enter a school code" step is gone.
- Browser sessions need care. The API returns the refresh token in the JSON body; before `apps/web` ships sign-in, it should move to an httpOnly, Secure, SameSite cookie for the school's host, which also needs CSRF protection.
- Browser exams cannot lock down the device. CBT will rely on full-screen mode and on noticing when the tab loses focus, unless the triggers above force a desktop app.
- CI's UI evidence check covers `apps/site`, `apps/web` and `packages/ui`.
