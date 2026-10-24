import { DAY_NAMES } from '../lib/dates';
import { byDay } from '../lib/timetable';
import type { Lesson } from '../lib/types';

/**
 * A week of lessons, one column per day. `detail` picks the second line: the
 * teacher (for a class's or a student's timetable) or the class (for a teacher's).
 */
export function WeekGrid({
  lessons,
  detail,
  onRemove,
}: {
  lessons: Lesson[];
  detail: 'teacher' | 'class';
  onRemove?: (lesson: Lesson) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
      {byDay(lessons).map((day) => (
        <section
          key={day.weekday}
          aria-label={DAY_NAMES[day.weekday]}
          className="flex flex-col gap-2"
        >
          <h3 className="font-mono text-[12.5px] uppercase tracking-wider text-fg-3">
            {DAY_NAMES[day.weekday]}
          </h3>
          {day.lessons.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-fg-3">
              No lessons
            </p>
          )}
          {day.lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="flex flex-col gap-1 rounded-2xl bg-card p-4"
            >
              <span className="font-mono text-[12.5px] text-fg-3">
                {lesson.startsAt}–{lesson.endsAt}
              </span>
              <span className="font-semibold">{lesson.subject.name}</span>
              <span className="text-[13px] text-fg-3">
                {detail === 'class'
                  ? lesson.class.name
                  : (lesson.teacher?.name ?? 'No teacher yet')}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(lesson)}
                  className="mt-1 self-start text-[13px] text-coral underline-offset-4 hover:underline"
                  aria-label={`Remove ${lesson.subject.name} on ${DAY_NAMES[lesson.weekday]} at ${lesson.startsAt}`}
                >
                  Remove
                </button>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
