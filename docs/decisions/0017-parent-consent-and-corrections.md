# 0017 — Parents' consent and corrections to the record

- Status: accepted
- Date: 2026-10-26

## Context

ADR 0016 gave each student a full admission record, health details and a passport
photo. Under the Nigeria Data Protection Act 2023 a child's data needs a parent's
consent (s. 31), consent must be informed and the school must be able to show it was
given (s. 26), it can be withdrawn at any time (s. 35), and the parent can see and
have corrected what is held (s. 34). Health and religion are sensitive (s. 30).
Many parents sign a paper form at the school office; some will answer online.

## Decision

- Three things a parent agrees to, each with its own sentence: the admission
  record, health details, and the photo (`CONSENT_WORDING` in
  `modules/consents/wording.ts`).
- Every answer is a row in `consents`: who (a guardian of the child), yes or no,
  how (`paper`, recorded by an admin, or `online`, by the parent), when, who
  recorded it, and the exact wording. The app role can only insert: the table is a
  log, never rewritten. The newest answer per purpose from a guardian still linked
  to the child is the one that counts; any linked guardian can answer.
- Health details and the photo cannot be saved without a current yes. A no erases
  them at once. A no to the record itself erases nothing: the school has to review
  it, since running the child's schooling may be another lawful basis; it shows as
  withdrawn on the student page.
- Parents see their child's whole record at `GET /children/:id`. Other guardians
  appear by name and relationship only, so separated parents don't see each other's
  phone numbers.
- Parents don't edit the record. They ask for a correction (`record_corrections`:
  the fields and new values, validated like the admission form, plus a note); an
  admin applies it as asked or declines with a reply the parent sees. Admission
  number, date admitted and the linked account are the school's and can't be asked
  for. Health corrections need the health consent.

## Consequences

- Schools with existing health details or photos and no recorded consent keep them,
  but can't change them until a parent answers. The student page shows what's
  missing.
- A student who turns 18 should answer for themselves; not handled yet.
- Parents with no account can only answer on paper until parent invites exist (the
  Mailer, ADR 0012).
