import { z } from 'zod';

// ISO dates (YYYY-MM-DD) compare correctly as strings.
const isoDate = z.iso.date();

const termInput = z.object({
  number: z.int().min(1).max(6),
  name: z.string().trim().min(1).max(60),
  startsOn: isoDate,
  endsOn: isoDate,
});

export const createSessionBody = z
  .object({
    name: z.string().trim().min(1).max(30),
    startsOn: isoDate,
    endsOn: isoDate,
    terms: z.array(termInput).max(6).default([]),
  })
  .superRefine((session, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    if (session.endsOn <= session.startsOn) {
      issue(['endsOn'], 'must be after startsOn');
    }
    const ordered = [...session.terms].sort((a, b) => a.number - b.number);
    ordered.forEach((term, i) => {
      const at = session.terms.indexOf(term);
      if (term.endsOn <= term.startsOn)
        issue(['terms', at, 'endsOn'], 'must be after startsOn');
      if (term.startsOn < session.startsOn || term.endsOn > session.endsOn) {
        issue(['terms', at], 'must fall within the session');
      }
      const previous = ordered[i - 1];
      if (previous?.number === term.number)
        issue(['terms', at, 'number'], 'is used twice');
      else if (previous && term.startsOn <= previous.endsOn) {
        issue(
          ['terms', at, 'startsOn'],
          `must be after term ${previous.number} ends`,
        );
      }
    });
  });

export type CreateSessionBody = z.infer<typeof createSessionBody>;
