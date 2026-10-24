import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  readStudentForm,
  StudentFields,
  type StudentInput,
} from '../components/StudentForm';
import { api, apiBlob } from '../lib/api';
import { BLOOD_GROUPS, GENOTYPES, RELIGIONS } from '../lib/nigeria';
import { formatPhone } from '../lib/phone';
import {
  useGuardianSearch,
  useStudent,
  useStudentGuardians,
  useWrite,
} from '../lib/queries';
import { useUser } from '../lib/session';
import type {
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

  return (
    <>
      <Link to="/students" className="text-sm text-fg-3 hover:text-fg">
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
      {editing ? (
        <EditStudent student={s} onDone={() => setEditing(false)} />
      ) : (
        <Details student={s} />
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

/** "9 March 2014", without the time zone moving the day. */
function longDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ageOn(iso: string, today = new Date()) {
  const born = new Date(`${iso}T12:00:00`);
  let age = today.getFullYear() - born.getFullYear();
  const birthday = new Date(born);
  birthday.setFullYear(today.getFullYear());
  if (birthday > today) age--;
  return age;
}

/** The admission record at a glance, with the passport photo. */
function Details({ student: s }: { student: StudentDetail }) {
  const rows: [string, string | null][] = [
    [
      'Full name',
      [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
    ],
    ['Sex', s.sex === 'female' ? 'Female' : s.sex === 'male' ? 'Male' : null],
    [
      'Date of birth',
      s.dateOfBirth
        ? `${longDate(s.dateOfBirth)} (age ${ageOn(s.dateOfBirth)})`
        : null,
    ],
    ['Date admitted', longDate(s.admittedOn)],
    ['Nationality', s.nationality],
    ['State of origin', s.stateOfOrigin],
    ['LGA', s.lga],
    ['Home address', s.homeAddress],
    ['Previous school', s.previousSchool],
    ['Religion', s.religion ? RELIGIONS[s.religion] : null],
  ];
  return (
    <Section title="Details">
      <div className="flex flex-wrap items-start gap-5 rounded-2xl bg-card p-5">
        <Photo student={s} />
        <dl className="grid min-w-0 flex-[1_1_320px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[13px] text-fg-3">{label}</dt>
              <dd className={value ? 'break-words' : 'text-fg-3'}>
                {value ?? 'Not given'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

const PHOTO_MAX_BYTES = 200 * 1024;
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * The passport photo. It is private, so it is fetched with the session and shown
 * from an object URL rather than linked directly.
 */
function Photo({ student }: { student: StudentDetail }) {
  const user = useUser();
  const [problem, setProblem] = useState<string>();
  const blob = useQuery({
    queryKey: ['students', 'photo', student.id, student.photoUpdatedAt],
    queryFn: () => apiBlob(`/students/${student.id}/photo`),
    enabled: !!student.photoUpdatedAt,
  });
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob.data) return setUrl(undefined);
    const objectUrl = URL.createObjectURL(blob.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob.data]);

  const upload = useWrite(
    (file: File) =>
      api(`/students/${student.id}/photo`, { method: 'PUT', body: file }),
    [['students', 'one', student.id]],
  );
  const remove = useWrite(
    () => api(`/students/${student.id}/photo`, { method: 'DELETE' }),
    [['students', 'one', student.id]],
  );

  function choose(file: File | undefined) {
    setProblem(undefined);
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type))
      return setProblem('Use a PNG, JPEG or WebP photo.');
    if (file.size > PHOTO_MAX_BYTES)
      return setProblem('The photo must be 200 KB or smaller.');
    upload.mutate(file);
  }

  return (
    <div className="flex w-[132px] flex-col gap-2">
      <div className="flex aspect-[7/9] w-full items-center justify-center overflow-hidden rounded-xl border border-edge bg-raised">
        {url ? (
          <img
            src={url}
            alt={`Passport photo of ${student.firstName} ${student.lastName}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="px-3 text-center text-[13px] text-fg-3">
            {student.photoUpdatedAt ? 'Loading…' : 'No passport photo'}
          </span>
        )}
      </div>
      {user.role === 'admin' && (
        <>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-edge-2 px-3 text-[14px] font-semibold hover:bg-raised has-[:focus-visible]:outline-2">
            {upload.isPending
              ? 'Uploading…'
              : student.photoUpdatedAt
                ? 'Replace photo'
                : 'Add photo'}
            <input
              type="file"
              accept={PHOTO_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {student.photoUpdatedAt && (
            <button
              type="button"
              onClick={() => remove.mutate(undefined)}
              disabled={remove.isPending}
              className="min-h-11 rounded-lg text-[13px] text-fg-2 hover:bg-raised"
            >
              Remove photo
            </button>
          )}
        </>
      )}
      {problem && (
        <p role="alert" className="text-[13px] text-coral">
          {problem}
        </p>
      )}
      <ErrorNote error={upload.error ?? remove.error ?? blob.error} />
    </div>
  );
}

/** Health details for emergencies. Sensitive data: staff only, and optional. */
function Health({ student }: { student: StudentDetail }) {
  const user = useUser();
  const [editing, setEditing] = useState(false);
  const h = student.health;
  const rows: [string, string | null | undefined][] = [
    ['Blood group', h?.bloodGroup],
    ['Genotype', h?.genotype],
    ['Allergies', h?.allergies],
    ['Conditions and medicines', h?.conditions],
  ];
  return (
    <Section
      title="Health"
      action={
        user.role === 'admin' &&
        !editing && (
          <Button variant="quiet" onClick={() => setEditing(true)}>
            {h ? 'Edit health' : 'Add health details'}
          </Button>
        )
      }
    >
      {editing ? (
        <EditHealth student={student} onDone={() => setEditing(false)} />
      ) : !h ? (
        <Empty>No health details on record.</Empty>
      ) : (
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-4 rounded-2xl bg-card p-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[13px] text-fg-3">{label}</dt>
              <dd className={value ? 'break-words' : 'text-fg-3'}>
                {value ?? 'Not given'}
              </dd>
            </div>
          ))}
        </dl>
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
  const h = student.health;
  const save = useWrite(
    (health: StudentHealth) =>
      api(`/students/${student.id}/health`, { method: 'PUT', body: health }),
    [['students', 'one', student.id]],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim() || null;
    save.mutate(
      {
        bloodGroup: value('bloodGroup'),
        genotype: value('genotype'),
        allergies: value('allergies'),
        conditions: value('conditions'),
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
        <Select
          label="Blood group"
          name="bloodGroup"
          defaultValue={h?.bloodGroup ?? ''}
        >
          <option value="">Not given</option>
          {BLOOD_GROUPS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </Select>
        <Select
          label="Genotype"
          name="genotype"
          defaultValue={h?.genotype ?? ''}
        >
          <option value="">Not given</option>
          {GENOTYPES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </Select>
        <Field
          label="Allergies"
          name="allergies"
          placeholder="Groundnuts, penicillin"
          defaultValue={h?.allergies ?? ''}
          maxLength={300}
        />
        <Field
          label="Conditions and medicines"
          name="conditions"
          placeholder="Asthma: inhaler in bag"
          defaultValue={h?.conditions ?? ''}
          maxLength={500}
        />
      </div>
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
