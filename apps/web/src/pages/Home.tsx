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
import { useChildren, useMyTimetable, useSessions } from '../lib/queries';
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
        <Children />
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
              className="rounded-2xl bg-card p-5 hover:bg-raised"
            >
              <span className="font-semibold">Students</span>
              <p className="mt-1 text-sm text-fg-3">
                Search, add and edit student records.
              </p>
            </Link>
            <Link
              to="/classes"
              className="rounded-2xl bg-card p-5 hover:bg-raised"
            >
              <span className="font-semibold">Classes</span>
              <p className="mt-1 text-sm text-fg-3">
                Class lists, subjects and timetables.
              </p>
            </Link>
          </div>
        </Section>
      )}
    </>
  );
}

/** A parent's children, each a way into their timetable and fees. */
function Children() {
  const children = useChildren();
  return (
    <Section title="Your children">
      <ErrorNote error={children.error} />
      {children.isPending ? (
        <Loading />
      ) : children.data?.length === 0 ? (
        <Empty>
          No children are linked to your account yet. Ask the school office to
          add you as their parent or guardian.
        </Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {children.data?.map((child) => (
            <li key={child.id}>
              <Card className="flex h-full flex-col gap-1.5">
                <span className="font-mono text-[12.5px] text-fg-3">
                  {child.class?.name ?? 'Not in a class yet'}
                </span>
                <span className="font-semibold">
                  {child.firstName} {child.lastName}
                </span>
                <span className="flex flex-wrap gap-x-4 text-sm">
                  <Link
                    to={`/timetable?child=${child.id}`}
                    className="text-fg-2 underline-offset-4 hover:underline"
                  >
                    Timetable
                  </Link>
                  <Link
                    to="/fees"
                    className="text-fg-2 underline-offset-4 hover:underline"
                  >
                    Fees
                  </Link>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
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
        <Link to="/timetable" className="text-sm text-fg-3 hover:text-fg">
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
                  className={`font-mono text-[12.5px] ${state === 'now' ? 'text-fg' : 'text-fg-3'}`}
                >
                  {lesson.startsAt}
                  {state === 'now' && ' · now'}
                </span>
                <span className="font-semibold">{lesson.subject.name}</span>
                <span className="text-[13px] text-fg-3">
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
