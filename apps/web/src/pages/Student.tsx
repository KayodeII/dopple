import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
} from '../components/ui';
import { api } from '../lib/api';
import { useStudent, useWrite } from '../lib/queries';
import { useUser } from '../lib/session';
import type { Student as StudentRecord, StudentDetail } from '../lib/types';

export function Student() {
  const { id = '' } = useParams();
  const user = useUser();
  const student = useStudent(id);
  const [editing, setEditing] = useState(false);

  if (student.isPending) return <Loading />;
  if (!student.data) return <ErrorNote error={student.error} />;
  const s = student.data;

  return (
    <>
      <Link to="/students" className="text-sm text-soft hover:text-paper">
        ← All students
      </Link>
      <PageHeader
        eyebrow={`Admission no. ${s.admissionNo}`}
        title={`${s.firstName} ${s.lastName}`}
      >
        {user.role === 'admin' && !editing && (
          <Button variant="quiet" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        )}
      </PageHeader>
      {editing && <EditStudent student={s} onDone={() => setEditing(false)} />}
      <Section title="Classes">
        {s.enrolments.length === 0 ? (
          <Empty>Not in a class yet.</Empty>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {s.enrolments.map((e) => (
              <li key={e.session.id}>
                <Card className="flex flex-col gap-1">
                  <span className="font-mono text-[12.5px] text-soft">
                    {e.session.name}
                  </span>
                  <Link
                    to={`/classes/${e.class.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {e.class.name}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Sign-in account">
        <p className="text-soft">
          {s.userId ? 'Linked to a student account.' : 'No account linked yet.'}
        </p>
      </Section>
    </>
  );
}

function EditStudent({
  student,
  onDone,
}: {
  student: StudentDetail;
  onDone: () => void;
}) {
  const save = useWrite(
    (patch: Partial<StudentRecord>) =>
      api<StudentRecord>(`/students/${student.id}`, {
        method: 'PATCH',
        body: patch,
      }),
    [['students']],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        admissionNo: String(form.get('admissionNo')),
        firstName: String(form.get('firstName')),
        lastName: String(form.get('lastName')),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-card p-5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Field
          label="Admission number"
          name="admissionNo"
          defaultValue={student.admissionNo}
          required
          maxLength={30}
        />
        <Field
          label="First name"
          name="firstName"
          defaultValue={student.firstName}
          required
          maxLength={80}
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={student.lastName}
          required
          maxLength={80}
        />
      </div>
      <ErrorNote error={save.error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          Save changes
        </Button>
        <Button type="button" variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
