# Roadmap: announced and coming soon

Features we mention publicly as "coming soon". Keep this list in step with the website copy
(`apps/site/src/lib/content.ts`, `apps/site/src/components/sections/Modules.tsx`): if a feature is
dropped or delayed, update the site in the same PR.

## Pay small small (coming soon)

Let parents pay a term's school fees in smaller instalments instead of one lump sum.

- **Who it helps:** parents who can't pay the full term at once; schools that would otherwise chase
  late or partial payments by hand.
- **Shown on the website:** fees card on the landing page and the "How do school fees reach our
  account?" FAQ, both marked "Coming soon".
- **Builds on:** the fees module (invoices, provider subaccounts, per-school payment ledger). Part
  payments already exist in the ledger design; Pay small small adds a schedule on top.

### Open questions before building

1. **Plan or credit?** Is it a school-approved instalment plan (parents pay the school over time,
   no lending), or financed (a partner pays the school upfront and the parent repays the partner)?
   Financing means consumer lending: it needs a licensed lending partner and CBN/FCCPC compliance,
   and Dopple should not hold the credit risk itself.
2. **Who sets the rules?** Number of instalments, deadlines, minimum first payment, late fees
   (or none), all per school.
3. **What happens on a missed instalment?** Reminders only, or restrictions (e.g. report card
   held)? This is a policy decision for each school, not for Dopple.
4. **Payment rails:** card tokenisation for automatic debits vs. a reminder plus a fresh payment
   each time (virtual account / transfer).

## Proctored exams (required, not started)

Exams whose results count must be proctored: school CBT exams (tests, terminal exams, entrance
exams) and Dopple mock exams that give a score someone relies on. Practice in Dopple Learn is
not proctored.

- **Who it helps:** schools that want to run CBT exams at home or in a lab without cheating
  doubts; learners who need a result others trust.
- **Likely layers, cheapest first:**
  1. Exam integrity built into the paper: questions and options shuffled per candidate, drawn
     from a bank, strict time limits, one sitting, answers saved on the server as they go
     (works offline for a few minutes, then syncs).
  2. Browser signals: fullscreen required, leaving the tab or app, copy and paste, and screen
     resizes are logged and shown to the invigilator. Nothing is blocked silently.
  3. Live invigilation: a teacher sees every candidate's status in real time (through
     `services/realtime`) and can message, pause or end a sitting.
  4. Camera: periodic snapshots (not continuous video, to save data) with an identity photo at
     the start, reviewed by a person. No automated decision fails a candidate on its own.
- **Builds on:** the exams (CBT) module, `services/realtime`, and auth.

### Open questions before building

1. **Children's data:** camera snapshots of under-18s are personal data (biometric if used for
   identity). They need a parent's consent under the NDPA, a retention limit (delete after the
   result is final?), and a legal review.
2. **Data cost:** how many KB per snapshot and how often, so a 1-hour exam stays under a set
   budget on mobile data?
3. **Devices:** many candidates use phones. What can a mobile browser enforce (fullscreen and tab
   switching are weaker on iOS)? Do we need an app for high-stakes exams?
4. **Who reviews flags,** and how does a candidate appeal?
5. **Lab mode:** schools with a computer lab may prefer a locked-down kiosk browser over camera
   proctoring.
