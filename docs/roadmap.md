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
