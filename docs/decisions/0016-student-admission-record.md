# 0016 — The student admission record

- Status: accepted
- Date: 2026-10-24

## Context

A student was only an admission number and a name. Nigerian schools register a
child with much more, and their paper and online forms are much alike: passport
photograph, full name, date of birth, sex, state of origin and LGA, religion, home
address, the previous school, health details (blood group, genotype, health
problems), then parents. Systems elsewhere (PowerSchool, for example) split the
same information into demographics, guardians, emergency contacts and health.

Religion, health and ethnic origin are sensitive personal data under the Nigeria
Data Protection Act 2023, and the data is about children, for whom a parent's
consent is the default basis (s. 31, with an education exception to check).

## Decision

- The record lives on `students`: middle name, sex, date of birth, date admitted,
  nationality, state of origin (the 36 states and the FCT), LGA (free text for now),
  home address, previous school, and religion. Only the admission number and names
  are required, so a school can register a child at the gate and fill in the rest.
- Health details go in their own table, `student_health` (blood group, genotype,
  allergies, conditions and medicines), so sensitive data has its own boundary and
  can be restricted further without touching the main record. Staff read it, admins
  change it; it is for emergencies.
- The passport photo is in `student_photos`, in Postgres like school logos (ADR
  0010) and with the same checks (PNG, JPEG or WebP sniffed from the bytes, 200 KB),
  but private: staff, the student themselves and their parents may see it, served
  with `Cache-Control: private, no-store`.
- Parents and guardians are ADR 0015's `guardians`; there is no separate emergency
  contact list yet.
- Not collected: NIN, tribe, mother tongue. We collect what schools need to run, not
  everything a form has room for; NIN can come when exam registration (WAEC, NECO)
  needs it.

## Consequences

- The student page shows the whole record, the photo and health; the same form
  registers and edits a student.
- Schools must be able to show parents what is held about their child and why.
  Recording consent, and letting a parent see and correct the record, are follow-ups.
- Photos are fetched with the session (an object URL), not linked, since an `<img>`
  cannot send the in-memory access token.
