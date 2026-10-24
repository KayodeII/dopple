import { z } from 'zod';

// 24-hour HH:MM, which compares correctly as a string.
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be a 24-hour time, HH:MM');

export const createSlotBody = z
  .object({
    termId: z.uuid(),
    subjectId: z.uuid(),
    /** ISO weekday: 1 is Monday. */
    weekday: z.int().min(1).max(7),
    startsAt: clock,
    endsAt: clock,
  })
  .refine((slot) => slot.endsAt > slot.startsAt, {
    path: ['endsAt'],
    message: 'must be after startsAt',
  });

export type CreateSlotBody = z.infer<typeof createSlotBody>;

export const termQuery = z.object({ termId: z.uuid() });

/** Parents say which child's timetable they want. */
export const myTimetableQuery = termQuery.extend({
  studentId: z.uuid().optional(),
});
