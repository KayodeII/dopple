# 0011 — Dopple Learn: free lessons and exam practice for anyone

- Status: accepted
- Date: 2026-10-18

## Context

About 18 million Nigerian children and young people are out of school, and tens of thousands sit
WASSCE or NECO each year as private candidates with no school behind them. Many of their families
have a phone and some data, but not school fees (`docs/research/nigeria-education.md`). Until now
Dopple only served schools, so a learner with no school had nothing.

Learners like this pay for data at about ₦500–800 per GB, often share a phone, and lose power. If
they are children, Nigerian law treats their personal data as needing a parent's consent.

## Decision

1. **A free learning area on the platform, outside any school.** It lives on the website at
   `dopple.school/learn` (later `learn.dopple.school`, so `learn` is now a reserved address). It is
   platform-level like the partner wall: there is no tenant, and no `TenantDb`.
2. **Organised like school:** stage (early years, primary, JSS, SSS) → class (Nursery 1 … SS 3) →
   subject (2025 curriculum names) → topic. Each topic has a short lesson and objective practice
   questions (A–D) with an explanation for every question.
3. **Content is code.** Lessons and questions live as JSON in `content/learn/`, are reviewed in
   pull requests, and are loaded into Postgres by `pnpm learn:load` (the owner role, idempotent
   upserts). Tables `learn_subjects`, `learn_topics` and `learn_questions` are platform-wide. The
   app role can only read them (like the tenant registry), and the API serves them at public
   `GET /learn/...` endpoints with cache headers.
4. **No account to learn.** Version 1 keeps progress on the device (browser storage), so it
   collects no personal data at all. Accounts and synced progress come later, with a parent's
   consent for under-18s.
5. **Text first.** Pages are server-rendered and a few KB, with no video and no client JavaScript
   except the practice questions. They must work on a slow connection and a cheap Android phone.
6. **Our own questions only.** Practice questions are written by Dopple to the published
   syllabuses. WAEC, NECO and JAMB past questions are not copied (they own them), unless licensed.

## Consequences

- Schools can use the same lessons for revision later; the school app can link to them.
- Content becomes the bottleneck: we need a way for qualified teachers to write and review lessons.
  Until then, every lesson is checked by hand in its PR. A small, correct catalogue beats a big,
  wrong one.
- Progress on the device is lost if the browser data is cleared or the phone changes. That is
  accepted for v1.
- **Exams must be proctored.** Practice stays open and unproctored. Exams whose scores count
  (school CBT exams, and any Dopple mock that gives a result someone relies on) need proctoring.
  That gets its own ADR before it is built, because camera proctoring of children is a privacy
  decision; see "Proctored exams" in `docs/roadmap.md`.
- Next: offline (service worker), CBT-style timed mock exams, exam guides (private candidates,
  five credits, UTME combinations), placement, then optional accounts.
