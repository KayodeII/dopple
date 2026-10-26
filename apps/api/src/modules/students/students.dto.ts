import { z } from 'zod';

/** Nigeria's 36 states and the FCT, as admission forms list them. */
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

const name = z.string().trim().min(1).max(80);
/** Optional text: blank means "not given", stored as null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();
const pastDate = z.iso
  .date()
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'must not be in the future',
  )
  .nullable();

export const studentFields = {
  admissionNo: z.string().trim().min(1).max(30),
  firstName: name,
  middleName: optionalText(80),
  lastName: name,
  sex: z.enum(['female', 'male']).nullable(),
  dateOfBirth: pastDate,
  admittedOn: pastDate,
  nationality: optionalText(60),
  stateOfOrigin: z.enum(NIGERIAN_STATES).nullable(),
  lga: optionalText(80),
  homeAddress: optionalText(300),
  previousSchool: optionalText(120),
  religion: z.enum(['christianity', 'islam', 'other']).nullable(),
  /** The student's own sign-in account; null unlinks it. */
  userId: z.uuid().nullable(),
};

/** Only the admission number and names are needed to register; the rest can follow. */
export const createStudentBody = z
  .object(studentFields)
  .partial()
  .required({ admissionNo: true, firstName: true, lastName: true });
export type CreateStudentBody = z.infer<typeof createStudentBody>;

export const updateStudentBody = z
  .object(studentFields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change');
export type UpdateStudentBody = z.infer<typeof updateStudentBody>;

export const listStudentsQuery = z.object({
  q: z.string().trim().max(80).optional(),
});

export const healthFields = {
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .nullable(),
  genotype: z.enum(['AA', 'AS', 'AC', 'SS', 'SC', 'CC']).nullable(),
  allergies: optionalText(300),
  conditions: optionalText(500),
};

/** The whole health record at once: what is left out is cleared. */
export const healthBody = z.object({
  bloodGroup: healthFields.bloodGroup.default(null),
  genotype: healthFields.genotype.default(null),
  allergies: healthFields.allergies.default(null),
  conditions: healthFields.conditions.default(null),
});
export type HealthBody = z.infer<typeof healthBody>;
