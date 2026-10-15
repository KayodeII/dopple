import { useState } from 'react';
import { TermPicker } from '../components/TermPicker';
import { Empty, ErrorNote, Loading, PageHeader } from '../components/ui';
import { WeekGrid } from '../components/WeekGrid';
import { allTerms, currentTerm, isoDate } from '../lib/dates';
import { useMyTimetable, useSessions } from '../lib/queries';
import { useUser } from '../lib/session';

/** A student's class timetable, or the lessons a teacher teaches across classes. */
export function MyTimetable() {
  const user = useUser();
  const sessions = useSessions();
  const [picked, setPicked] = useState<string>();
  const terms = sessions.data ? allTerms(sessions.data) : [];
  const termId =
    picked ??
    (sessions.data
      ? currentTerm(sessions.data, isoDate(new Date()))?.term.id
      : undefined);
  const timetable = useMyTimetable(termId);

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'student' ? 'Your class' : 'Lessons you teach'}
        title="Timetable"
      >
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
            : 'You have no lessons this term.'}
        </Empty>
      ) : (
        <WeekGrid
          lessons={timetable.data ?? []}
          detail={user.role === 'student' ? 'teacher' : 'class'}
        />
      )}
    </>
  );
}
