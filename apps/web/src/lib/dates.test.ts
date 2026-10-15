import { describe, expect, it } from 'vitest';
import {
  currentSession,
  currentTerm,
  greeting,
  isoDate,
  isoWeekday,
} from './dates';
import type { AcademicSession } from './types';

const year = (
  name: string,
  starts: string,
  ends: string,
  terms: [string, string][],
) =>
  ({
    id: name,
    name,
    startsOn: starts,
    endsOn: ends,
    terms: terms.map(([startsOn, endsOn], i) => ({
      id: `${name}-t${i + 1}`,
      number: i + 1,
      name: `Term ${i + 1}`,
      startsOn,
      endsOn,
    })),
  }) satisfies AcademicSession;

const sessions = [
  year('2027/2028', '2027-09-06', '2028-07-21', [['2027-09-06', '2027-12-10']]),
  year('2026/2027', '2026-09-07', '2027-07-23', [
    ['2026-09-07', '2026-12-11'],
    ['2027-01-11', '2027-04-02'],
  ]),
];

describe('currentTerm', () => {
  it('finds the term running today, across years', () => {
    expect(currentTerm(sessions, '2026-10-14')?.term.id).toBe('2026/2027-t1');
    expect(currentTerm(sessions, '2027-12-10')?.term.id).toBe('2027/2028-t1');
  });

  it('shows the next term during the holidays, and the last one after the year', () => {
    expect(currentTerm(sessions, '2026-12-25')?.term.id).toBe('2026/2027-t2');
    expect(currentTerm(sessions, '2026-01-01')?.term.id).toBe('2026/2027-t1');
    expect(currentTerm(sessions, '2029-01-01')?.term.id).toBe('2027/2028-t1');
    expect(currentTerm([], '2026-10-14')).toBeNull();
  });
});

describe('currentSession', () => {
  it('picks the running year, else the next, else the latest', () => {
    expect(currentSession(sessions, '2027-08-01')?.id).toBe('2027/2028');
    expect(currentSession(sessions, '2026-10-14')?.id).toBe('2026/2027');
    expect(currentSession(sessions, '2030-01-01')?.id).toBe('2027/2028');
  });
});

describe('dates', () => {
  it('uses the local calendar date and ISO weekdays', () => {
    const sundayNight = new Date(2026, 9, 18, 23, 30);
    expect(isoDate(sundayNight)).toBe('2026-10-18');
    expect(isoWeekday(sundayNight)).toBe(7);
    expect(isoWeekday(new Date(2026, 9, 12))).toBe(1);
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 9, 14, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 14, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 14, 19))).toBe('Good evening');
  });
});
