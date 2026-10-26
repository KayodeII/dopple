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
  Select,
} from '../components/ui';
import {
  HealthFields,
  readHealthForm,
  readStudentForm,
  StudentFields,
  type StudentInput,
} from '../components/StudentForm';
import { CorrectionCard } from '../components/CorrectionCard';
import { Details, HealthList } from '../components/StudentRecord';
import { api } from '../lib/api';
import { formatPhone } from '../lib/phone';
import { answerText, PURPOSE_LABELS } from '../lib/record';
import {
  useGuardianSearch,
  usePendingCorrections,
  useStudent,
  useStudentGuardians,
  useWrite,
} from '../lib/queries';
import { useUser } from '../lib/session';
import type {
  ConsentPurpose,
  StudentDetail,
  StudentGuardian,
  StudentHealth,
} from '../lib/types';

export function Student() {
  const { id = '' } = useParams();
  const user = useUser();
  const student = useStudent(id);
  const [editing, setEditing] = useState(false);

  if (student.isPending) return <Loading />;
  if (!student.data) return <ErrorNote error={student.error} />;
  const s = student.data;
  const isAdmin = user.role === 'admin';

  return (
    <>
      <Link to="/students" className="text-sm text-fg-3 hover:text-fg">
        ← All students
      </Link>
      <PageHeader
        eyebrow={`Admission no. ${s.admissionNo}`}
        title={`${s.firstName} ${s.lastName}`}
      >
        {isAdmin && !editing && (
          <Button variant="quiet" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        )}
      </PageHeader>
      {isAdmin && <Corrections studentId={s.id} />}
      {editing ? (
        <EditStudent student={s} onDone={() => setEditing(false)} />
      ) : (
        <Details
          student={s}
          canChangePhoto={isAdmin && !!s.consents.photo?.given}
        />
      )}
      <Section title="Classes">
        {s.enrolments.length === 0 ? (
          <Empty>Not in a class yet.</Empty>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {s.enrolments.map((e) => (
              <li key={e.session.id}>
                <Card className="flex flex-col gap-1">
                  <span className="font-mono text-[12.5px] text-fg-3">
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
      <Guardians student={s} />
      <Consent student={s} />
      <Health student={s} />
      <Section title="Sign-in account">
        <p className="text-fg-3">
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
    (patch: StudentInput) =>
      api(`/students/${student.id}`, { method: 'PATCH', body: patch }),
    [['students']],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(readStudentForm(new FormData(event.currentTarget)), {
      onSuccess: onDone,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-card p-5"
    >
      <StudentFields student={student} />
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

/**
 * Where the parents' consent stands (ADR 0017). Admins record answers from the
 * signed admission form; parents with an account can answer online.
 */
function Consent({ student }: { student: StudentDetail }) {
  const user = useUser();
  const [recording, setRecording] = useState(false);
  return (
    <Section
      title="Consent"
      action={
        user.role === 'admin' &&
        !recording && (
          <Button variant="quiet" onClick={() => setRecording(true)}>
            Record a paper form
          </Button>
        )
      }
    >
      {recording && (
        <RecordConsent student={student} onDone={() => setRecording(false)} />
      )}
      <ul className="flex flex-col divide-y divide-edge rounded-2xl bg-card">
        {(Object.keys(PURPOSE_LABELS) as ConsentPurpose[]).map((purpose) => {
          const answer = student.consents[purpose];
          return (
            <li
              key={purpose}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
            >
              <span className="font-semibold">{PURPOSE_LABELS[purpose]}</span>
              <span
                className={`text-[14px] ${
                  answer?.given
                    ? 'text-fg-2'
                    : answer
                      ? 'text-coral'
                      : 'text-fg-3'
                }`}
              >
                {answerText(answer)}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function RecordConsent({
  student,
  onDone,
}: {
  student: StudentDetail;
  onDone: () => void;
}) {
  const guardians = useStudentGuardians(student.id);
  const save = useWrite(
    (input: { purpose: string; guardianId: string; given: boolean }) =>
      api(`/students/${student.id}/consents/${input.purpose}`, {
        method: 'PUT',
        body: { guardianId: input.guardianId, given: input.given },
      }),
    [['students', 'one', student.id]],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        purpose: String(form.get('purpose')),
        guardianId: String(form.get('guardianId')),
        given: form.get('given') === 'yes',
      },
      { onSuccess: onDone },
    );
  }

  if (guardians.data?.length === 0) {
    return (
      <Empty>Add a parent or guardian first: consent is theirs to give.</Empty>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-card p-5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Select label="Signed by" name="guardianId" required>
          {guardians.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.relationship})
            </option>
          ))}
        </Select>
        <Select label="For" name="purpose" required>
          {(Object.keys(PURPOSE_LABELS) as ConsentPurpose[]).map((p) => (
            <option key={p} value={p}>
              {PURPOSE_LABELS[p]}
            </option>
          ))}
        </Select>
        <Select label="Their answer" name="given" required>
          <option value="yes">Agreed</option>
          <option value="no">Said no</option>
        </Select>
      </div>
      <p className="text-[14px] text-fg-3">
        A no to health details or the photo erases them from the record.
      </p>
      <ErrorNote error={save.error ?? guardians.error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending || guardians.isPending}>
          Save answer
        </Button>
        <Button type="button" variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** A parent's open requests to correct this record, for the admin to apply or decline. */
function Corrections({ studentId }: { studentId: string }) {
  const pending = usePendingCorrections(studentId);
  if (!pending.data?.length) return <ErrorNote error={pending.error} />;
  return (
    <Section title="Corrections to check">
      <ul className="flex flex-col gap-3">
        {pending.data.map((c) => (
          <li key={c.id}>
            <CorrectionCard correction={c} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Health details for emergencies. Sensitive data: staff only, kept only with consent. */
function Health({ student }: { student: StudentDetail }) {
  const user = useUser();
  const [editing, setEditing] = useState(false);
  const h = student.health;
  const agreed = !!student.consents.health?.given;
  return (
    <Section
      title="Health"
      action={
        user.role === 'admin' &&
        agreed &&
        !editing && (
          <Button variant="quiet" onClick={() => setEditing(true)}>
            {h ? 'Edit health' : 'Add health details'}
          </Button>
        )
      }
    >
      {editing ? (
        <EditHealth student={student} onDone={() => setEditing(false)} />
      ) : h ? (
        <HealthList health={h} />
      ) : (
        <Empty>
          {agreed
            ? 'No health details on record.'
            : 'No health details. A parent must agree before the school keeps them.'}
        </Empty>
      )}
    </Section>
  );
}

function EditHealth({
  student,
  onDone,
}: {
  student: StudentDetail;
  onDone: () => void;
}) {
  const save = useWrite(
    (health: StudentHealth) =>
      api(`/students/${student.id}/health`, { method: 'PUT', body: health }),
    [['students', 'one', student.id]],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(readHealthForm(new FormData(event.currentTarget)), {
      onSuccess: onDone,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl bg-card p-5"
    >
      <HealthFields health={student.health} />
      <p className="text-[14px] text-fg-3">
        Only staff at this school can see health details.
      </p>
      <ErrorNote error={save.error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          Save health details
        </Button>
        <Button type="button" variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const RELATIONSHIPS = [
  'Mother',
  'Father',
  'Guardian',
  'Grandmother',
  'Grandfather',
  'Aunt',
  'Uncle',
  'Sister',
  'Brother',
];

/** Who the school calls about this student. Staff read it; admins change it. */
function Guardians({ student }: { student: StudentDetail }) {
  const user = useUser();
  const guardians = useStudentGuardians(student.id);
  const [adding, setAdding] = useState(false);
  const remove = useWrite(
    (guardianId: string) =>
      api(`/students/${student.id}/guardians/${guardianId}`, {
        method: 'DELETE',
      }),
    [['guardians'], ['children']],
  );
  const isAdmin = user.role === 'admin';

  return (
    <Section
      title="Parents and guardians"
      action={
        isAdmin &&
        !adding && (
          <Button variant="quiet" onClick={() => setAdding(true)}>
            Add guardian
          </Button>
        )
      }
    >
      <ErrorNote error={guardians.error ?? remove.error} />
      {adding && (
        <AddGuardian student={student} onDone={() => setAdding(false)} />
      )}
      {guardians.isPending ? (
        <Loading />
      ) : guardians.data?.length === 0 ? (
        <Empty>No parent or guardian on record yet.</Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {guardians.data?.map((g) => (
            <li key={g.id}>
              <GuardianCard
                guardian={g}
                onRemove={isAdmin ? () => remove.mutate(g.id) : undefined}
                removing={remove.isPending}
                studentName={student.firstName}
              />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function GuardianCard({
  guardian: g,
  onRemove,
  removing,
  studentName,
}: {
  guardian: StudentGuardian;
  onRemove?: () => void;
  removing: boolean;
  studentName: string;
}) {
  return (
    <Card className="flex h-full flex-col gap-1.5">
      <span className="font-mono text-[12.5px] text-fg-3">
        {g.relationship}
      </span>
      <span className="font-semibold">{g.name}</span>
      <a
        href={`tel:${g.phone}`}
        className="w-fit text-[15px] underline-offset-4 hover:underline"
      >
        {formatPhone(g.phone)}
      </a>
      {g.email && (
        <a
          href={`mailto:${g.email}`}
          className="w-fit truncate text-[14px] text-fg-2 underline-offset-4 hover:underline"
        >
          {g.email}
        </a>
      )}
      <span className="text-[13px] text-fg-3">
        {g.userId ? 'Has a parent account' : 'No parent account yet'}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${g.name} from ${studentName}`}
          className="mt-1 min-h-11 w-fit rounded-lg px-2 text-[13px] text-fg-2 hover:bg-raised"
        >
          Remove
        </button>
      )}
    </Card>
  );
}

/**
 * A new guardian, or one already on record: brothers and sisters usually share
 * parents, so the school should not type them in twice.
 */
function AddGuardian({
  student,
  onDone,
}: {
  student: StudentDetail;
  onDone: () => void;
}) {
  const [relationship, setRelationship] = useState('');
  const [q, setQ] = useState('');
  const matches = useGuardianSearch(q.trim());
  const add = useWrite(
    (body: object) =>
      api(`/students/${student.id}/guardians`, { method: 'POST', body }),
    [['guardians'], ['children']],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    add.mutate(
      {
        relationship,
        name: String(form.get('name')),
        phone: String(form.get('phone')),
        email: String(form.get('email')).trim() || null,
      },
      { onSuccess: onDone },
    );
  }

  function link(guardianId: string, form: HTMLFormElement | null) {
    const field = form?.elements.namedItem('relationship');
    if (field instanceof HTMLInputElement && !field.reportValidity()) return;
    add.mutate({ guardianId, relationship }, { onSuccess: onDone });
  }

  const found = (matches.data ?? []).filter(
    (m) => !m.children.some((c) => c.id === student.id),
  );

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex flex-col gap-5 rounded-2xl bg-card p-5"
    >
      <div className="max-w-[280px]">
        <Field
          label={`Relationship to ${student.firstName}`}
          name="relationship"
          list="relationships"
          placeholder="Mother"
          required
          maxLength={30}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
        <datalist id="relationships">
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-3">
        <Field
          label="Already a parent here? Search by name or phone"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Adebayo or 0803"
        />
        {q.trim().length >= 2 &&
          (found.length === 0 ? (
            <p className="text-[14px] text-fg-3">
              Nobody on record matches. Add them below.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {found.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge px-4 py-2"
                >
                  <span>
                    <span className="font-semibold">{m.name}</span>{' '}
                    <span className="text-[14px] text-fg-3">
                      {formatPhone(m.phone)}
                      {m.children.length > 0 &&
                        ` · ${m.children.map((c) => c.firstName).join(', ')}`}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="quiet"
                    disabled={add.isPending}
                    onClick={(e) => link(m.id, e.currentTarget.form)}
                    aria-label={`Link ${m.name}`}
                  >
                    Link
                  </Button>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-edge pt-5">
        <p className="text-[14px] text-fg-3">Or someone new</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Field label="Full name" name="name" required maxLength={120} />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="off"
            placeholder="0803 123 4567"
            required
          />
          <Field label="Email (optional)" name="email" type="email" />
        </div>
      </div>
      <ErrorNote error={add.error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={add.isPending}>
          Add guardian
        </Button>
        <Button type="button" variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
