import { useDeferredValue, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Empty,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
} from '../components/ui';
import {
  readStudentForm,
  StudentFields,
  type StudentInput,
} from '../components/StudentForm';
import { api } from '../lib/api';
import { useStudents, useWrite } from '../lib/queries';
import { useUser } from '../lib/session';
import type { Student } from '../lib/types';

/** Search the school's students; admins can add one. */
export function Students() {
  const user = useUser();
  const [q, setQ] = useState('');
  const search = useDeferredValue(q.trim());
  const students = useStudents(search);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Records" title="Students">
        {user.role === 'admin' && !adding && (
          <Button onClick={() => setAdding(true)}>Add student</Button>
        )}
      </PageHeader>
      {adding && <AddStudent onClose={() => setAdding(false)} />}
      <Section title="All students">
        <div className="max-w-[420px]">
          <Field
            label="Search by name or admission number"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ErrorNote error={students.error} />
        {students.isPending ? (
          <Loading />
        ) : students.data?.length === 0 ? (
          <Empty>
            {search ? `No students match “${search}”.` : 'No students yet.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-card">
            <table className="w-full min-w-[480px] text-left text-[15px]">
              <thead className="text-[13px] text-fg-3">
                <tr>
                  <th className="px-4 py-3 font-normal">Admission no.</th>
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Sign-in account</th>
                </tr>
              </thead>
              <tbody>
                {students.data?.map((s) => (
                  <tr key={s.id} className="border-t border-edge">
                    <td className="px-4 py-3 font-mono text-[13px]">
                      {s.admissionNo}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/students/${s.id}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {s.lastName}, {s.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-3">
                      {s.userId ? 'Linked' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}

function AddStudent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const add = useWrite(
    (input: StudentInput) =>
      api<Student>('/students', { method: 'POST', body: input }),
    [['students']],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add.mutate(readStudentForm(new FormData(event.currentTarget)), {
      onSuccess: (student) => navigate(`/students/${student.id}`),
    });
  }

  return (
    <Section title="New student">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl bg-card p-5"
      >
        <StudentFields />
        <p className="text-[14px] text-fg-3">
          Only the admission number and names are needed now. Add the passport
          photo, parents and health details on the student’s page next.
        </p>
        <ErrorNote error={add.error} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={add.isPending}>
            Save student
          </Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Section>
  );
}
