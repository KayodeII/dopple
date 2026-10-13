# 0006 — Timetable: weekly periods per class and term

- Status: accepted
- Date: 2026-10-13

## Context

Schools need a weekly timetable per class, which changes from term to term. Teachers want their own lessons across classes; students want their class's. Two kinds of clash matter: two periods at once in one class, and one teacher in two classes at once.

## Decision

- `timetable_slots`: one row per weekly period (`term_id`, `class_id`, `subject_id`, ISO `weekday`, `starts_at`/`ends_at` as wall-clock `time`). It also stores `session_id`, so composite foreign keys tie the term and the class to the same session (`terms_id_session`, `classes_id_session`).
- The subject must be one the class takes: the slot references `class_subjects (tenant_id, class_id, subject_id)`, and removing a subject from a class removes its periods.
- The teacher is not copied onto the slot. It is read from `class_subjects`, so changing a subject's teacher updates the whole timetable.
- **Overlaps within a class are refused by Postgres:** an exclusion constraint (`timetable_slots_no_overlap`, needs the `btree_gist` extension) over tenant, class, term, weekday and the minute range. Periods are half-open, so back-to-back periods are fine. drizzle-kit cannot express exclusion constraints; it lives only in migration 0006. The `DatabaseErrorFilter` maps its error (23P01) to 409.
- **Teacher double-booking is checked by the service** when a period is added, because the teacher lives on another table. It locks the teacher's user row first, so two admins timetabling the same teacher take turns.
- `GET /timetable/me?termId=`: staff get the lessons they teach, students get their enrolled class's. Parents wait for guardians.

## Consequences

- Changing a subject's teacher (`PUT /classes/:id/subjects/:subjectId`) does not re-check clashes yet; a clash report or a check there is a follow-up.
- Times have no timezone. The school's timezone (not stored yet) applies when the portal shows "now".
- Rotating timetables (week A/B) and one-off changes are out of scope.
