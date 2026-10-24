import { z } from 'zod';

/** Kobo. ₦100,000,000 is far above any school fee and well inside a safe integer. */
const amountMinor = z.int().min(100).max(10_000_000_000);

/** Bill one fee to some students, or to everyone enrolled in a class: exactly one of the two. */
export const createFeesBody = z
  .object({
    description: z.string().trim().min(1).max(120),
    amountMinor,
    dueOn: z.iso.date().nullable().default(null),
    studentIds: z.array(z.uuid()).min(1).max(500).optional(),
    classId: z.uuid().optional(),
  })
  .refine((body) => !!body.studentIds !== !!body.classId, {
    message: 'Choose students or a class, not both',
    path: ['studentIds'],
  });
export type CreateFeesBody = z.infer<typeof createFeesBody>;

export const listFeesQuery = z.object({ studentId: z.uuid().optional() });
