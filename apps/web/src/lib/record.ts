import { RELIGIONS } from './nigeria';
import type {
  ConsentAnswer,
  ConsentPurpose,
  CorrectionChanges,
  Religion,
  StudentHealth,
  StudentProfile,
} from './types';

type Field =
  keyof StudentProfile | keyof StudentHealth | 'firstName' | 'lastName';

/** What each record field is called on the admission form. */
export const FIELD_LABELS: Record<Field, string> = {
  firstName: 'First name',
  middleName: 'Middle name',
  lastName: 'Last name',
  sex: 'Sex',
  dateOfBirth: 'Date of birth',
  admittedOn: 'Date admitted',
  nationality: 'Nationality',
  stateOfOrigin: 'State of origin',
  lga: 'LGA',
  homeAddress: 'Home address',
  previousSchool: 'Previous school',
  religion: 'Religion',
  bloodGroup: 'Blood group',
  genotype: 'Genotype',
  allergies: 'Allergies',
  conditions: 'Conditions and medicines',
};

export const PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  record: 'Admission record',
  health: 'Health details',
  photo: 'Passport photo',
};

/** "9 March 2014", without the time zone moving the day. */
export function longDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** A stored value as people read it: "Female", "Islam", "9 March 2014". */
export function showValue(field: string, value: string | null | undefined) {
  if (value === null || value === undefined) return 'Not given';
  if (field === 'sex') return value === 'female' ? 'Female' : 'Male';
  if (field === 'religion') return RELIGIONS[value as Religion] ?? value;
  if (field === 'dateOfBirth' || field === 'admittedOn')
    return longDate(value) ?? value;
  return value;
}

/** Only the fields whose value differs from what the record holds now. */
export function changedFields(
  current: Record<string, unknown>,
  proposed: CorrectionChanges,
): CorrectionChanges {
  return Object.fromEntries(
    Object.entries(proposed).filter(
      ([field, value]) => (current[field] ?? null) !== value,
    ),
  );
}

/** "Agreed by Ngozi Okafor (Mother), online, 24 October 2026". */
export function answerText(answer: ConsentAnswer | null) {
  if (!answer) return 'Not asked yet';
  return `${answer.given ? 'Agreed' : 'Said no'} · ${answer.guardian.name} (${answer.relationship}), ${
    answer.method === 'paper' ? 'on paper' : 'online'
  }, ${longDate(answer.at)}`;
}
