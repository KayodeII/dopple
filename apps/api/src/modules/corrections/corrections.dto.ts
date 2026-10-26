import { z } from 'zod';
import {
  healthFields,
  optionalText,
  studentFields,
} from '../students/students.dto.js';

// The school's own entries (admission number and date, the linked account) are not
// a parent's to correct.
const {
  admissionNo: _no,
  admittedOn: _on,
  userId: _user,
  ...recordFields
} = studentFields;

export const RECORD_FIELDS = Object.keys(recordFields);
export const HEALTH_FIELDS = Object.keys(healthFields);

export const requestCorrectionBody = z.object({
  /** Only the fields to change, with their new values; null clears one. */
  changes: z
    .strictObject({ ...recordFields, ...healthFields })
    .partial()
    .refine((changes) => Object.keys(changes).length > 0, 'Nothing to change'),
  note: optionalText(500).default(null),
});
export type RequestCorrectionBody = z.infer<typeof requestCorrectionBody>;

export const declineCorrectionBody = z.object({
  reply: z.string().trim().min(1).max(500),
});

export const pendingCorrectionsQuery = z.object({
  studentId: z.uuid().optional(),
});
