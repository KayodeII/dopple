# 0014 — School admins review Learn lessons

- Status: accepted
- Date: 2026-10-24

## Context

Dopple Learn lessons are written to the NERDC curriculum (ADR 0011), and content is the
bottleneck. Some lessons were written by an agent and need checking by someone who knows how
the subject is taught in Nigerian schools.

## Decision

A school admin on Dopple reviews lesson notes before they count as reviewed. Anyone may draft a
lesson; a school admin checks the lesson and its answers and approves it or sends it back.

Until there is a review screen, the review happens in the content pull request: a school admin
approves it, and the PR notes who reviewed it.

## Consequences

- Lessons will need a review state (draft, reviewed) and the reviewer's school. Whether
  unreviewed lessons are hidden from `/learn` or labelled is still open.
- A review screen in the school web app comes later. It reads platform-wide Learn content, so it
  is a platform feature reached from a school, not tenant data; that needs its own design.
- We rely on admins' goodwill. If reviews stall, revisit paid or volunteer teacher reviewers.
