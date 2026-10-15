import type { Lesson } from './types';

export interface Day {
  weekday: number;
  lessons: Lesson[];
}

/** Monday to Friday always, Saturday and Sunday only if something is on. Lessons in time order. */
export function byDay(lessons: Lesson[]): Day[] {
  const days: Day[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    const on = lessons
      .filter((l) => l.weekday === weekday)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (weekday <= 5 || on.length) days.push({ weekday, lessons: on });
  }
  return days;
}

/** Where `now` ("HH:MM") falls in a day's lessons: before, during or after each one. */
export function lessonState(
  lesson: Lesson,
  now: string,
): 'past' | 'now' | 'next' {
  if (now >= lesson.endsAt) return 'past';
  if (now >= lesson.startsAt) return 'now';
  return 'next';
}
