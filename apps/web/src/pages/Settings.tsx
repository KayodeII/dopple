import { useState, type ChangeEvent, type FormEvent } from 'react';
import { SchoolBadge } from '../components/SchoolTheme';
import {
  Button,
  ErrorNote,
  Field,
  Loading,
  PageHeader,
  Section,
} from '../components/ui';
import { api } from '../lib/api';
import { contrast, DEFAULT_SCHOOL_COLOR, GROUND, textOn } from '../lib/color';
import { useSchool, useWrite } from '../lib/queries';
import type { School } from '../lib/types';

const LOGO_MAX_BYTES = 200 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** The school's name, colour and logo (admins only). Changes show across the app straight away. */
export function Settings() {
  const school = useSchool();
  if (school.isPending) return <Loading />;
  if (!school.data) return <ErrorNote error={school.error} />;
  return (
    <>
      <PageHeader
        eyebrow={school.data.url.replace(/^https?:\/\//, '')}
        title="School settings"
      />
      <Profile school={school.data} />
      <Logo school={school.data} />
    </>
  );
}

function Profile({ school }: { school: School }) {
  const [name, setName] = useState(school.name);
  const [color, setColor] = useState(school.brandColor ?? DEFAULT_SCHOOL_COLOR);
  const [isDefault, setIsDefault] = useState(school.brandColor === null);
  const save = useWrite(
    (patch: { name: string; brandColor: string | null }) =>
      api<School>('/school', { method: 'PATCH', body: patch }),
    [['school']],
  );
  const valid = /^#[0-9a-f]{6}$/.test(color);
  const preview = valid ? color : DEFAULT_SCHOOL_COLOR;
  const faint = valid && contrast(color, GROUND) < 1.6;

  function pick(value: string) {
    setColor(value.trim().toLowerCase());
    setIsDefault(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate({ name, brandColor: isDefault ? null : color });
  }

  return (
    <Section title="Name and colour">
      <form
        onSubmit={submit}
        className="flex flex-col gap-5 rounded-2xl bg-card p-5"
      >
        <div className="max-w-[480px]">
          <Field
            label="School name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-sand">
            Colour
            <input
              type="color"
              value={preview}
              onChange={(e) => pick(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-xl border border-iron bg-graphite p-1"
            />
          </label>
          <div className="w-36">
            <Field
              label="Hex"
              value={color}
              onChange={(e) => pick(e.target.value)}
              pattern="#[0-9a-fA-F]{6}"
            />
          </div>
          <Button
            type="button"
            variant="quiet"
            onClick={() => {
              setColor(DEFAULT_SCHOOL_COLOR);
              setIsDefault(true);
            }}
          >
            Use Dopple’s colour
          </Button>
        </div>
        {faint && (
          <p className="text-[13px] text-sun">
            This colour is very dark and will be hard to see on the dark
            background.
          </p>
        )}
        <div
          aria-label="Preview"
          className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-line p-4"
        >
          <span
            className="flex size-9 items-center justify-center rounded-[10px] font-display text-lg font-bold"
            style={{ background: preview, color: textOn(preview) }}
            aria-hidden="true"
          >
            {name[0] ?? ''}
          </span>
          <span
            className="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold"
            style={{ background: preview, color: textOn(preview) }}
          >
            Sign in
          </span>
          <span
            className="rounded-2xl bg-ground p-3 text-sm"
            style={{ boxShadow: `inset 0 0 0 2px ${preview}` }}
          >
            08:40 · now
          </span>
        </div>
        <ErrorNote error={save.error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending || !valid}>
            Save
          </Button>
          {save.isSuccess && !save.isPending && (
            <span className="text-sm text-soft">Saved.</span>
          )}
        </div>
      </form>
    </Section>
  );
}

function Logo({ school }: { school: School }) {
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useWrite(
    (file: File) => api<School>('/school/logo', { method: 'PUT', body: file }),
    [['school']],
  );
  const remove = useWrite(
    () => api('/school/logo', { method: 'DELETE' }),
    [['school']],
  );

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type))
      return setProblem('Choose a PNG, JPEG or WebP image.');
    if (file.size > LOGO_MAX_BYTES)
      return setProblem('The logo must be 200 KB or smaller.');
    setProblem(null);
    upload.mutate(file);
  }

  return (
    <Section title="Logo">
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <SchoolBadge size="lg" />
          <p className="text-sm text-soft">
            {school.logoUrl
              ? 'Shown on the sign-in page, in the sidebar and in the website’s school search.'
              : 'No logo yet: your school’s first letter is shown instead.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-school px-5 text-[15px] font-semibold text-on-school hover:brightness-110">
            {upload.isPending
              ? 'Uploading…'
              : school.logoUrl
                ? 'Replace logo'
                : 'Upload logo'}
            <input
              type="file"
              accept={LOGO_TYPES.join(',')}
              onChange={choose}
              className="sr-only"
            />
          </label>
          {school.logoUrl && (
            <Button
              variant="danger"
              onClick={() => remove.mutate(undefined)}
              disabled={remove.isPending}
            >
              Remove logo
            </Button>
          )}
        </div>
        <p className="text-[13px] text-soft">
          PNG, JPEG or WebP, up to 200 KB. A square image looks best.
        </p>
        {problem && (
          <p role="alert" className="text-[15px] text-coral">
            {problem}
          </p>
        )}
        <ErrorNote error={upload.error ?? remove.error} />
      </div>
    </Section>
  );
}
