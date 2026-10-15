import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { TermPicker } from '../components/TermPicker';
import {
  Button,
  Empty,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
  Select,
} from '../components/ui';
import { WeekGrid } from '../components/WeekGrid';
import { api } from '../lib/api';
import { allTerms, currentTerm, DAY_NAMES, isoDate } from '../lib/dates';
import {
  useClass,
  useClassStudents,
  useClassSubjects,
  useClassTimetable,
  useSessions,
  useStudents,
  useWrite,
} from '../lib/queries';
import { useUser } from '../lib/session';
import type { AcademicSession, SchoolClass } from '../lib/types';

/** One class: its timetable, its students and its subjects. Admins can change all three. */
export function ClassPage() {
  const { id = '' } = useParams();
  const schoolClass = useClass(id);
  const sessions = useSessions();

  if (schoolClass.isPending || sessions.isPending) return <Loading />;
  if (!schoolClass.data || !sessions.data) {
    return <ErrorNote error={schoolClass.error ?? sessions.error} />;
  }
  const c = schoolClass.data;
  const session = sessions.data.find((s) => s.id === c.sessionId);

  return (
    <>
      <Link to="/classes" className="text-sm text-soft hover:text-paper">
        ← All classes
      </Link>
      <PageHeader
        eyebrow={[
          c.level,
          session?.name,
          c.formTeacher
            ? `Form teacher: ${c.formTeacher.name}`
            : 'No form teacher',
        ]
          .filter(Boolean)
          .join(' · ')}
        title={c.name}
      />
      {session && <ClassTimetable schoolClass={c} session={session} />}
      <ClassStudents classId={c.id} />
      <ClassSubjects classId={c.id} />
    </>
  );
}

function ClassTimetable({
  schoolClass,
  session,
}: {
  schoolClass: SchoolClass;
  session: AcademicSession;
}) {
  const user = useUser();
  const terms = allTerms([session]);
  const [picked, setPicked] = useState<string>();
  const termId = picked ?? currentTerm([session], isoDate(new Date()))?.term.id;
  const timetable = useClassTimetable(schoolClass.id, termId);
  const remove = useWrite(
    (lessonId: string) =>
      api(`/classes/${schoolClass.id}/timetable/${lessonId}`, {
        method: 'DELETE',
      }),
    [['timetable']],
  );
  const isAdmin = user.role === 'admin';

  return (
    <Section
      title="Timetable"
      action={
        terms.length > 0 && (
          <TermPicker terms={terms} value={termId} onChange={setPicked} />
        )
      }
    >
      {isAdmin && termId && (
        <AddLesson classId={schoolClass.id} termId={termId} />
      )}
      <ErrorNote error={timetable.error ?? remove.error} />
      {!termId ? (
        <Empty>This school year has no terms yet.</Empty>
      ) : timetable.isPending ? (
        <Loading />
      ) : (
        <WeekGrid
          lessons={timetable.data ?? []}
          detail="teacher"
          onRemove={isAdmin ? (lesson) => remove.mutate(lesson.id) : undefined}
        />
      )}
    </Section>
  );
}

function AddLesson({ classId, termId }: { classId: string; termId: string }) {
  const subjects = useClassSubjects(classId);
  const add = useWrite(
    (input: {
      subjectId: string;
      weekday: number;
      startsAt: string;
      endsAt: string;
    }) =>
      api(`/classes/${classId}/timetable`, {
        method: 'POST',
        body: { ...input, termId },
      }),
    [['timetable']],
  );

  if (subjects.data?.length === 0) {
    return (
      <Empty>Add subjects to this class before building its timetable.</Empty>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    add.mutate({
      subjectId: String(form.get('subjectId')),
      weekday: Number(form.get('weekday')),
      startsAt: String(form.get('startsAt')),
      endsAt: String(form.get('endsAt')),
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Add a lesson"
      className="flex flex-col gap-4 rounded-2xl bg-card p-5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-end gap-4">
        <Select label="Subject" name="subjectId" required>
          {subjects.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Day" name="weekday" defaultValue="1">
          {DAY_NAMES.slice(1).map((day, i) => (
            <option key={day} value={i + 1}>
              {day}
            </option>
          ))}
        </Select>
        <Field
          label="Starts"
          name="startsAt"
          type="time"
          required
          defaultValue="08:00"
        />
        <Field
          label="Ends"
          name="endsAt"
          type="time"
          required
          defaultValue="08:40"
        />
        <Button type="submit" disabled={add.isPending || !subjects.data}>
          Add lesson
        </Button>
      </div>
      <ErrorNote error={add.error} />
    </form>
  );
}

function ClassStudents({ classId }: { classId: string }) {
  const user = useUser();
  const students = useClassStudents(classId);
  const remove = useWrite(
    (studentId: string) =>
      api(`/classes/${classId}/students/${studentId}`, { method: 'DELETE' }),
    [['classes', classId, 'students'], ['students']],
  );

  return (
    <Section
      title={`Students${students.data ? ` (${students.data.length})` : ''}`}
    >
      {user.role === 'admin' && (
        <EnrolStudent
          classId={classId}
          enrolled={new Set(students.data?.map((s) => s.id))}
        />
      )}
      <ErrorNote error={students.error ?? remove.error} />
      {students.isPending ? (
        <Loading />
      ) : students.data?.length === 0 ? (
        <Empty>No students in this class yet.</Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-edge rounded-2xl bg-card">
          {students.data?.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <Link
                to={`/students/${s.id}`}
                className="underline-offset-4 hover:underline"
              >
                <span className="font-semibold">
                  {s.lastName}, {s.firstName}
                </span>
                <span className="ml-3 font-mono text-[13px] text-soft">
                  {s.admissionNo}
                </span>
              </Link>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => remove.mutate(s.id)}
                  className="min-h-11 text-[13px] text-coral underline-offset-4 hover:underline"
                  aria-label={`Remove ${s.firstName} ${s.lastName} from this class`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function EnrolStudent({
  classId,
  enrolled,
}: {
  classId: string;
  enrolled: Set<string>;
}) {
  const all = useStudents('');
  const [studentId, setStudentId] = useState('');
  const enrol = useWrite(
    (id: string) =>
      api(`/classes/${classId}/students/${id}`, { method: 'PUT' }),
    [['classes'], ['students']],
  );
  const options = (all.data ?? []).filter((s) => !enrolled.has(s.id));
  if (!all.data || options.length === 0) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (studentId)
      enrol.mutate(studentId, { onSuccess: () => setStudentId('') });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Add a student to this class"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[1_1_260px]">
          <Select
            label="Add a student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Choose a student…</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName} ({s.admissionNo})
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={!studentId || enrol.isPending}>
          Add to class
        </Button>
      </div>
      <p className="text-[13px] text-soft">
        A student already in another class this school year moves here.
      </p>
      <ErrorNote error={enrol.error} />
    </form>
  );
}

function ClassSubjects({ classId }: { classId: string }) {
  const subjects = useClassSubjects(classId);
  return (
    <Section title="Subjects">
      <ErrorNote error={subjects.error} />
      {subjects.isPending ? (
        <Loading />
      ) : subjects.data?.length === 0 ? (
        <Empty>No subjects yet.</Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {subjects.data?.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-1 rounded-2xl bg-card p-4"
            >
              <span className="font-mono text-[12.5px] text-soft">
                {s.code}
              </span>
              <span className="font-semibold">{s.name}</span>
              <span className="text-[13px] text-soft">
                {s.teacher?.name ?? 'No teacher yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
