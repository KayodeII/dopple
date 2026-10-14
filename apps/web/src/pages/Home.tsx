import { Link } from 'react-router';
import {
  Card,
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Section,
} from '../components/ui';
import {
  clock,
  currentTerm,
  DAY_NAMES,
  greeting,
  isoDate,
  isoWeekday,
} from '../lib/dates';
import { useMyTimetable, useSessions } from '../lib/queries';
import { isStaff, useUser } from '../lib/session';
import { lessonState } from '../lib/timetable';

/** "Good morning, Tolu." and today's lessons, as on the student home artboard. */
export function Home() {
  const user = useUser();
  const now = new Date();
  const sessions = useSessions();
  const current = sessions.data
    ? currentTerm(sessions.data, isoDate(now))
    : null;
  const firstName = user.name.split(/\s+/)[0];

  return (
    <>
      <PageHeader
        eyebrow={[DAY_NAMES[isoWeekday(now)], current?.term.name]
          .filter(Boolean)
          .join(' · ')}
        title={`${greeting(now)}, ${firstName}.`}
      />
      {user.role === 'parent' ? (
        <Empty>
          Parent accounts are coming soon. Once your school links your account
          to your children, their timetable will show here.
        </Empty>
      ) : (
        <Today
          termId={current?.term.id}
          loading={sessions.isPending}
          error={sessions.error}
        />
      )}
      {isStaff(user) && (
        <Section title="Records">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <Link
              to="/students"
              className="rounded-2xl bg-card p-5 hover:bg-graphite"
            >
              <span className="font-semibold">Students</span>
              <p className="mt-1 text-sm text-soft">
                Search, add and edit student records.
              </p>
            </Link>
            <Link
              to="/classes"
              className="rounded-2xl bg-card p-5 hover:bg-graphite"
            >
              <span className="font-semibold">Classes</span>
              <p className="mt-1 text-sm text-soft">
                Class lists, subjects and timetables.
              </p>
            </Link>
          </div>
        </Section>
      )}
    </>
  );
}

function Today({
  termId,
  loading,
  error,
}: {
  termId: string | undefined;
  loading: boolean;
  error: unknown;
}) {
  const user = useUser();
  const timetable = useMyTimetable(termId);
  const now = new Date();
  const today = (timetable.data ?? [])
    .filter((lesson) => lesson.weekday === isoWeekday(now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <Section
      title="Today"
      action={
        <Link to="/timetable" className="text-sm text-soft hover:text-paper">
          Full timetable
        </Link>
      }
    >
      <ErrorNote error={error ?? timetable.error} />
      {loading || (termId && timetable.isPending) ? (
        <Loading />
      ) : !termId ? (
        <Empty>No term has been set up yet.</Empty>
      ) : today.length === 0 ? (
        <Empty>
          {user.role === 'student'
            ? 'No lessons today.'
            : 'You are not teaching today.'}
        </Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {today.map((lesson) => {
            const state = lessonState(lesson, clock(now));
            return (
              <Card
                key={lesson.id}
                className={`flex flex-col gap-1.5 ${state === 'past' ? 'opacity-55' : ''} ${
                  state === 'now'
                    ? 'shadow-[inset_0_0_0_2px_var(--color-school)]'
                    : ''
                }`}
              >
                <span
                  className={`font-mono text-[12.5px] ${state === 'now' ? 'text-paper' : 'text-soft'}`}
                >
                  {lesson.startsAt}
                  {state === 'now' && ' · now'}
                </span>
                <span className="font-semibold">{lesson.subject.name}</span>
                <span className="text-[13px] text-soft">
                  {user.role === 'student'
                    ? (lesson.teacher?.name ?? 'No teacher yet')
                    : lesson.class.name}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}
