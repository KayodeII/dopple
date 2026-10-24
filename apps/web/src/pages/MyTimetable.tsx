import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { TermPicker } from '../components/TermPicker';
import {
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Select,
} from '../components/ui';
import { WeekGrid } from '../components/WeekGrid';
import { allTerms, currentTerm, isoDate } from '../lib/dates';
import { useChildren, useMyTimetable, useSessions } from '../lib/queries';
import { useUser } from '../lib/session';

/**
 * A student's class timetable, a parent's child's (picked with ?child=), or the
 * lessons a teacher teaches across classes.
 */
export function MyTimetable() {
  const user = useUser();
  return user.role === 'parent' ? <ChildTimetable /> : <Timetable />;
}

function ChildTimetable() {
  const children = useChildren();
  const [params, setParams] = useSearchParams();
  if (children.isPending) return <Loading />;
  if (!children.data?.length) {
    return (
      <>
        <PageHeader eyebrow="Your children" title="Timetable" />
        <ErrorNote error={children.error} />
        <Empty>No children are linked to your account yet.</Empty>
      </>
    );
  }
  const child =
    children.data.find((c) => c.id === params.get('child')) ?? children.data[0];
  return (
    <Timetable
      studentId={child.id}
      eyebrow={`${child.firstName}’s class${child.class ? `, ${child.class.name}` : ''}`}
      picker={
        children.data.length > 1 && (
          <div className="w-full max-w-[220px]">
            <Select
              label="Child"
              value={child.id}
              onChange={(e) => setParams({ child: e.target.value })}
            >
              {children.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName}
                </option>
              ))}
            </Select>
          </div>
        )
      }
    />
  );
}

function Timetable({
  studentId,
  eyebrow,
  picker,
}: {
  studentId?: string;
  eyebrow?: string;
  picker?: ReactNode;
}) {
  const user = useUser();
  const sessions = useSessions();
  const [picked, setPicked] = useState<string>();
  const terms = sessions.data ? allTerms(sessions.data) : [];
  const termId =
    picked ??
    (sessions.data
      ? currentTerm(sessions.data, isoDate(new Date()))?.term.id
      : undefined);
  const timetable = useMyTimetable(termId, studentId);
  const forStudent = user.role === 'student' || user.role === 'parent';

  return (
    <>
      <PageHeader
        eyebrow={
          eyebrow ??
          (user.role === 'student' ? 'Your class' : 'Lessons you teach')
        }
        title="Timetable"
      >
        {picker}
        {terms.length > 0 && (
          <TermPicker terms={terms} value={termId} onChange={setPicked} />
        )}
      </PageHeader>
      <ErrorNote error={sessions.error ?? timetable.error} />
      {sessions.isPending || (termId && timetable.isPending) ? (
        <Loading />
      ) : !termId ? (
        <Empty>No term has been set up yet.</Empty>
      ) : timetable.data?.length === 0 ? (
        <Empty>
          {user.role === 'student'
            ? 'No lessons yet. Your timetable appears once you are in a class that has one.'
            : user.role === 'parent'
              ? 'No lessons yet. The timetable appears once your child is in a class that has one.'
              : 'You have no lessons this term.'}
        </Empty>
      ) : (
        <WeekGrid
          lessons={timetable.data ?? []}
          detail={forStudent ? 'teacher' : 'class'}
        />
      )}
    </>
  );
}
