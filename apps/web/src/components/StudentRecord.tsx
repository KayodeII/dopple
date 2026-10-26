import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, apiBlob } from '../lib/api';
import { RELIGIONS } from '../lib/nigeria';
import { useWrite } from '../lib/queries';
import { longDate } from '../lib/record';
import type { StudentDetail, StudentHealth } from '../lib/types';
import { ErrorNote, Section } from './ui';

/** The record as the student page and a parent's view both show it. */

function ageOn(iso: string, today = new Date()) {
  const born = new Date(`${iso}T12:00:00`);
  let age = today.getFullYear() - born.getFullYear();
  const birthday = new Date(born);
  birthday.setFullYear(today.getFullYear());
  if (birthday > today) age--;
  return age;
}

/** The admission record at a glance, with the passport photo. */
export function Details({
  student: s,
  canChangePhoto = false,
}: {
  student: Omit<StudentDetail, 'userId'>;
  canChangePhoto?: boolean;
}) {
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
        <Photo student={s} canChange={canChangePhoto} />
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
function Photo({
  student,
  canChange,
}: {
  student: Omit<StudentDetail, 'userId'>;
  canChange: boolean;
}) {
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
      {canChange && (
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

/** Health details as a list; the caller decides who sees them. */
export function HealthList({ health: h }: { health: StudentHealth }) {
  const rows: [string, string | null][] = [
    ['Blood group', h.bloodGroup],
    ['Genotype', h.genotype],
    ['Allergies', h.allergies],
    ['Conditions and medicines', h.conditions],
  ];
  return (
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
  );
}
