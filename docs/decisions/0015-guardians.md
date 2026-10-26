# 0015 — Guardians and parent accounts

- Status: accepted
- Date: 2026-10-24

## Context

Parents are usually the ones paying fees, and they want to see their children's
timetables. Until now `users` had a `parent` role, but nothing linked a parent to a
child. Schools also need parents' contact details whether or not the parent ever
signs in: many Nigerian parents have a phone but no email, and form teachers call them.

## Decision

- `guardians` holds a school's parents and guardians: name, phone (required, stored
  as E.164; local numbers like `0803 123 4567` are read as +234), optional email, and
  an optional `user_id` linking a `parent` account. This follows `students.user_id`:
  the record exists first, and an account is linked to it.
- `student_guardians` links guardians to students, with the relationship as the
  school writes it ("Mother", "Uncle"). One guardian can have several children, so
  brothers and sisters share one guardian record; the admin finds them by name or phone.
- A parent account acts for exactly the children linked to it. `myStudentIds()` in
  `modules/guardians` is the one place that decides which students a signed-in user
  acts for (a student's own record, or a parent's children); timetable and fees use it.
- Staff (admins and teachers) can read guardians; only admins change them.
- Unlinking a guardian from their last child removes the guardian record.
- Parent accounts are not created from the web app yet. They come with invites over
  email (ADR 0012), so the school never sets or sends a parent's password.

## Consequences

- Parents can see their children, each child's timetable, and their children's fees,
  and pay them. The payment records the parent as the payer.
- A guardian's phone is the thing a school will match on; duplicate guardians with
  the same phone are possible until a school links rather than re-adds them.
- Next: inviting a parent by email (needs the Mailer adapter), and SMS or WhatsApp
  later for parents without email.
