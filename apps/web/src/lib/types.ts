/** Shapes returned by the API (see the endpoint table in the root README). */

export type Role = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface School {
  slug: string;
  name: string;
  city: string | null;
  /** "#rrggbb", or null for Dopple's default. */
  brandColor: string | null;
  /** "#rrggbb" for highlights, or null to reuse the brand colour. */
  accentColor: string | null;
  url: string;
  /** Same-origin path to the logo, or null. */
  logoUrl: string | null;
}

export interface Ref {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

export type Religion = 'christianity' | 'islam' | 'other';

/** The admission record beyond name and number; every field is optional. */
export interface StudentProfile {
  middleName: string | null;
  sex: 'female' | 'male' | null;
  dateOfBirth: string | null;
  admittedOn: string | null;
  nationality: string | null;
  stateOfOrigin: string | null;
  lga: string | null;
  homeAddress: string | null;
  previousSchool: string | null;
  religion: Religion | null;
}

export interface StudentHealth {
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string | null;
  conditions: string | null;
}

export type ConsentPurpose = 'record' | 'health' | 'photo';

/** A guardian's newest answer for one purpose (ADR 0017). */
export interface ConsentAnswer {
  given: boolean;
  method: 'paper' | 'online';
  /** The sentence they agreed or refused, word for word. */
  wording: string;
  at: string;
  guardian: Ref;
  relationship: string;
}

/** Null where nobody has answered yet. */
export type Consents = Record<ConsentPurpose, ConsentAnswer | null>;

export interface StudentDetail extends Student, StudentProfile {
  /** When the passport photo last changed; null if there is none. */
  photoUpdatedAt: string | null;
  health: StudentHealth | null;
  consents: Consents;
  enrolments: { session: Ref; class: Ref }[];
}

/** A child's record as their parent sees it. */
export interface ChildRecord extends Omit<StudentDetail, 'userId'> {
  /** Other guardians come with name and relationship only. */
  guardians: (Omit<StudentGuardian, 'userId' | 'phone'> & {
    phone: string | null;
    you: boolean;
  })[];
  consentWording: Record<ConsentPurpose, string>;
}

/** Field name to new value, as the parent asked. */
export type CorrectionChanges = Partial<
  Record<keyof StudentProfile | keyof StudentHealth, string | null>
>;

export interface Correction {
  id: string;
  changes: CorrectionChanges;
  note: string | null;
  status: 'pending' | 'applied' | 'declined';
  reply: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** An open request, for the admin: with what the record holds now. */
export interface PendingCorrection {
  id: string;
  changes: CorrectionChanges;
  current: CorrectionChanges;
  note: string | null;
  createdAt: string;
  requestedBy: Ref;
  student: { id: string; firstName: string; lastName: string };
}

export interface Term {
  id: string;
  number: number;
  name: string;
  startsOn: string;
  endsOn: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  terms: Term[];
}

export interface SchoolClass {
  id: string;
  sessionId: string;
  name: string;
  level: string;
  formTeacher: Ref | null;
}

export interface ClassStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}

export interface ClassSubject {
  id: string;
  name: string;
  code: string;
  teacher: Ref | null;
}

export interface Lesson {
  id: string;
  /** ISO weekday: 1 is Monday. */
  weekday: number;
  startsAt: string;
  endsAt: string;
  class: Ref;
  subject: { id: string; code: string; name: string };
  teacher: Ref | null;
}

export interface Fee {
  id: string;
  description: string;
  /** Kobo. */
  amountMinor: number;
  paidMinor: number;
  currency: string;
  dueOn: string | null;
  status: 'paid' | 'part-paid' | 'unpaid';
  student: ClassStudent;
}

export interface PaymentAccount {
  provider: string;
  connected: boolean;
  status?: 'pending' | 'active' | 'restricted';
  /** What the provider still needs from the school. */
  requirementsDue?: string[];
}

export interface Guardian {
  id: string;
  name: string;
  /** E.164, e.g. +2348031234567. */
  phone: string;
  email: string | null;
  /** Their parent account, if they have one. */
  userId: string | null;
}

export interface StudentGuardian extends Guardian {
  relationship: string;
}

export interface GuardianMatch extends Guardian {
  children: { id: string; firstName: string; lastName: string }[];
}

/** One of a parent's children, with their class in the latest session. */
export interface Child {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  class: Ref | null;
}
