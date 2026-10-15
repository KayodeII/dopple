import { useState } from 'react';
import { Link } from 'react-router';
import {
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Select,
} from '../components/ui';
import { currentSession, isoDate } from '../lib/dates';
import { useClasses, useSessions } from '../lib/queries';

/** The classes in a school year, this year by default. */
export function Classes() {
  const sessions = useSessions();
  const [picked, setPicked] = useState<string>();
  const sessionId =
    picked ??
    (sessions.data
      ? currentSession(sessions.data, isoDate(new Date()))?.id
      : undefined);
  const classes = useClasses(sessionId);

  return (
    <>
      <PageHeader eyebrow="Records" title="Classes">
        {sessions.data && sessions.data.length > 1 && (
          <div className="w-full max-w-[240px]">
            <Select
              label="School year"
              value={sessionId ?? ''}
              onChange={(e) => setPicked(e.target.value)}
            >
              {sessions.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </PageHeader>
      <ErrorNote error={sessions.error ?? classes.error} />
      {sessions.isPending || (sessionId && classes.isPending) ? (
        <Loading />
      ) : !sessionId ? (
        <Empty>No school year has been set up yet.</Empty>
      ) : classes.data?.length === 0 ? (
        <Empty>No classes in this school year yet.</Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {classes.data?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/classes/${c.id}`}
                className="flex flex-col gap-1 rounded-2xl bg-card p-5 hover:bg-graphite"
              >
                <span className="font-mono text-[12.5px] text-soft">
                  {c.level}
                </span>
                <span className="font-display text-2xl font-semibold">
                  {c.name}
                </span>
                <span className="text-sm text-soft">
                  {c.formTeacher
                    ? `Form teacher: ${c.formTeacher.name}`
                    : 'No form teacher'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
