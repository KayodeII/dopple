import { describe, expect, it } from 'vitest';
import { byDay, lessonState } from './timetable';
import type { Lesson } from './types';

const lesson = (weekday: number, startsAt: string, endsAt: string): Lesson => ({
  id: `${weekday}-${startsAt}`,
  weekday,
  startsAt,
  endsAt,
  class: { id: 'c', name: 'JSS 1A' },
  subject: { id: 's', code: 'MTH', name: 'Mathematics' },
  teacher: null,
});

describe('byDay', () => {
  it('always shows Monday to Friday, in time order', () => {
    const days = byDay([
      lesson(1, '09:20', '10:00'),
      lesson(1, '08:00', '08:40'),
    ]);
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5]);
    expect(days[0]!.lessons.map((l) => l.startsAt)).toEqual(['08:00', '09:20']);
  });

  it('adds weekend days only when something is on', () => {
    expect(byDay([lesson(6, '10:00', '11:00')]).map((d) => d.weekday)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe('lessonState', () => {
  const maths = lesson(1, '08:40', '09:20');
  it('treats lessons as half-open, like the API', () => {
    expect(lessonState(maths, '08:39')).toBe('next');
    expect(lessonState(maths, '08:40')).toBe('now');
    expect(lessonState(maths, '09:19')).toBe('now');
    expect(lessonState(maths, '09:20')).toBe('past');
  });
});
