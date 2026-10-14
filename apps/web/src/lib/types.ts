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
