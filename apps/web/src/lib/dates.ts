import type { AcademicSession, Term } from './types';

export const DAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** The local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 1 for Monday ... 7 for Sunday, like the API. */
export const isoWeekday = (date: Date) => date.getDay() || 7;

/** "08:40" at that date's local time, for comparing with lesson times. */
export function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface TermInSession {
  term: Term;
  session: AcademicSession;
}

export function allTerms(sessions: AcademicSession[]): TermInSession[] {
  return sessions
    .flatMap((session) => session.terms.map((term) => ({ term, session })))
    .sort((a, b) => a.term.startsOn.localeCompare(b.term.startsOn));
}

/**
 * The term running on `today`. Between terms, the next one to start (so the
 * holidays show what's coming); after the last term, the most recent one.
 */
export function currentTerm(
  sessions: AcademicSession[],
  today: string,
): TermInSession | null {
  const terms = allTerms(sessions);
  return (
    terms.find(({ term }) => term.startsOn <= today && today <= term.endsOn) ??
    terms.find(({ term }) => term.startsOn > today) ??
    terms.at(-1) ??
    null
  );
}

/** The session running on `today`, else the next, else the latest. */
export function currentSession(
  sessions: AcademicSession[],
  today: string,
): AcademicSession | null {
  const sorted = [...sessions].sort((a, b) =>
    a.startsOn.localeCompare(b.startsOn),
  );
  return (
    sorted.find((s) => s.startsOn <= today && today <= s.endsOn) ??
    sorted.find((s) => s.startsOn > today) ??
    sorted.at(-1) ??
    null
  );
}
