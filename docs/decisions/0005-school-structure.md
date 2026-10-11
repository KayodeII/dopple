# 0005 — School structure: sessions, terms, classes, subjects

- Status: accepted
- Date: 2026-10-11

## Context

Nearly every feature (timetables, attendance, grades, exams, fees) hangs off when something happens (school year, term) and who it is for (class, subject). Nigerian schools run a session (e.g. 2026/2027) of three terms, with students in class groups such as "JSS 1A". Tables that reference each other must not be able to link one school's row to another's.

## Decision

- **Tables:** `academic_sessions` (school year), `terms` (numbered within a session), `subjects` (unique upper-case code per school), `classes` (name unique within a session, a `level` such as "JSS 1", optional form teacher).
- **Classes belong to a session.** "JSS 1A" in 2026/2027 and in 2027/2028 are different rows, so each year's roster, timetable and form teacher stay intact as history.
- **Composite foreign keys.** Every reference between tenant-owned tables is `(tenant_id, x_id) → (tenant_id, id)`. Postgres checks foreign keys without row-level security, so a plain `x_id` reference could point at another school's row; including `tenant_id` makes that impossible.
- **The database enforces uniqueness and references.** A global `DatabaseErrorFilter` maps unique violations to 409 and foreign-key/check violations to 422, instead of check-then-insert in services. A reference to another school's row gets the same 422 as a missing one, so it reveals nothing.
- **Access:** anyone signed in at the school can read; only admins create or change.

## Consequences

- New tenant-owned tables that reference others must use composite foreign keys (now a rule in AGENTS.md).
- Rules that need a lookup (the form teacher must be an active teacher or admin) stay in services, inside the same `TenantDb.run()` transaction.
- Not yet: enrolments, subject teachers per class, timetable, and archiving or deleting sessions.
