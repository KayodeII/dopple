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

export interface StudentDetail extends Student {
  enrolments: { session: Ref; class: Ref }[];
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
