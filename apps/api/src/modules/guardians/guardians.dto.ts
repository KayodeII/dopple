import { z } from 'zod';

/**
 * A phone number in E.164, or null if it is not one. Nigerian numbers are usually
 * written locally ("0803 123 4567"), so a leading 0 means +234.
 */
export function normalisePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-.()]/g, '');
  const e164 = /^0\d{10}$/.test(compact)
    ? `+234${compact.slice(1)}`
    : /^234\d{10}$/.test(compact)
      ? `+${compact}`
      : compact;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

const phone = z.string().transform((raw, ctx) => {
  const normalised = normalisePhone(raw);
  if (!normalised) {
    ctx.addIssue({
      code: 'custom',
      message: 'must be a phone number, like 0803 123 4567',
    });
    return z.NEVER;
  }
  return normalised;
});

const guardianFields = {
  name: z.string().trim().min(1).max(120),
  phone,
  email: z.string().trim().toLowerCase().pipe(z.email()).nullable(),
  /** The guardian's parent account; null unlinks it. */
  userId: z.uuid().nullable(),
};
const relationship = z.string().trim().min(1).max(30);

/** Link someone already on record (a sibling's parent), or add a new guardian. */
export const addGuardianBody = z.union([
  z.object({ guardianId: z.uuid(), relationship }),
  z.object({
    ...guardianFields,
    email: guardianFields.email.optional(),
    userId: guardianFields.userId.optional(),
    relationship,
  }),
]);
export type AddGuardianBody = z.infer<typeof addGuardianBody>;

export const updateGuardianBody = z
  .object(guardianFields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change');
export type UpdateGuardianBody = z.infer<typeof updateGuardianBody>;

export const searchGuardiansQuery = z.object({
  q: z.string().trim().max(80).optional(),
});
