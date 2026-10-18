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
import {
  contrast,
  DEFAULT_SCHOOL_COLOR,
  GROUND_DARK,
  GROUND_LIGHT,
  textOn,
} from '../lib/color';
import { useSchool, useWrite } from '../lib/queries';
import { useUser } from '../lib/session';
import { useTheme, type Theme } from '../lib/theme';
import type { School } from '../lib/types';

const LOGO_MAX_BYTES = 200 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Everyone picks their theme here; admins also set the school's name, colour and logo. */
export function Settings() {
  const isAdmin = useUser().role === 'admin';
  const school = useSchool();
  return (
    <>
      <PageHeader eyebrow={window.location.hostname} title="Settings" />
      <Appearance />
      {isAdmin &&
        (school.isPending ? (
          <Loading />
        ) : school.data ? (
          <>
            <Profile school={school.data} />
            <Logo school={school.data} />
          </>
        ) : (
          <ErrorNote error={school.error} />
        ))}
    </>
  );
}

const THEMES: { value: Theme; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Warm paper, the default' },
  { value: 'dark', label: 'Dark', hint: 'Easier at night' },
  {
    value: 'system',
    label: 'Match my device',
    hint: 'Follows your phone or computer',
  },
];

/** Only for this browser: each person picks their own. */
function Appearance() {
  const [theme, setTheme] = useTheme();
  return (
    <Section title="Appearance">
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Theme</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((option) => (
            <label
              key={option.value}
              className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-edge bg-card p-3 has-checked:border-school has-checked:ring-1 has-checked:ring-school"
            >
              <ThemeSwatch theme={option.value} />
              <span className="flex items-center gap-2.5 px-1">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="size-4 accent-school"
                />
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">
                    {option.label}
                  </span>
                  <span className="text-[13px] text-fg-3">{option.hint}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-[13px] text-fg-3">Saved on this device only.</p>
      </fieldset>
    </Section>
  );
}

/** A tiny drawing of the app in each theme, painted with that theme's own colours. */
function ThemeSwatch({ theme }: { theme: Theme }) {
  const half = (mode: 'light' | 'dark') => (
    <span data-theme={mode} className="flex flex-1 gap-1.5 bg-ground p-2">
      <span className="w-1/4 rounded bg-raised" />
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-2 w-2/3 rounded-full bg-fg" />
        <span className="flex-1 rounded bg-card" />
        <span className="h-2 w-1/3 rounded-full bg-school" />
      </span>
    </span>
  );
  return (
    <span
      aria-hidden="true"
      className="flex h-20 overflow-hidden rounded-xl border border-edge"
    >
      {theme === 'system' ? (
        <>
          {half('light')}
          {half('dark')}
        </>
      ) : (
        half(theme)
      )}
    </span>
  );
}

const isHex = (value: string) => /^#[0-9a-f]{6}$/.test(value);

/** Which theme, if any, a colour all but disappears into. */
function faintIn(color: string): 'light' | 'dark' | null {
  if (!isHex(color)) return null;
  if (contrast(color, GROUND_LIGHT) < 1.6) return 'light';
  if (contrast(color, GROUND_DARK) < 1.6) return 'dark';
  return null;
}

/** One colour: a swatch picker, its hex, and a way back to the fallback (null). */
function useColour(saved: string | null, fallback: string) {
  const [value, setValue] = useState(saved ?? fallback);
  const [unset, setUnset] = useState(saved === null);
  return {
    value: unset ? fallback : value,
    unset,
    pick: (next: string) => {
      setValue(next.trim().toLowerCase());
      setUnset(false);
    },
    reset: () => setUnset(true),
    saved: () => (unset ? null : value),
  };
}

function ColourPicker({
  label,
  colour,
  resetLabel,
}: {
  label: string;
  colour: ReturnType<typeof useColour>;
  resetLabel: string;
}) {
  const faint = faintIn(colour.value);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={isHex(colour.value) ? colour.value : DEFAULT_SCHOOL_COLOR}
          onChange={(e) => colour.pick(e.target.value)}
          className="h-11 w-16 cursor-pointer rounded-xl border border-edge-2 bg-raised p-1"
        />
        <div className="w-36">
          <Field
            label={`${label} hex`}
            value={colour.value}
            onChange={(e) => colour.pick(e.target.value)}
            pattern="#[0-9a-fA-F]{6}"
          />
        </div>
        <Button
          type="button"
          variant="quiet"
          onClick={colour.reset}
          disabled={colour.unset}
        >
          {resetLabel}
        </Button>
      </div>
      {faint && (
        <p className="text-[13px] text-warn">
          This colour is very {faint === 'dark' ? 'dark' : 'light'} and will be
          hard to see in the {faint} theme.
        </p>
      )}
    </fieldset>
  );
}

function Profile({ school }: { school: School }) {
  const [name, setName] = useState(school.name);
  const main = useColour(school.brandColor, DEFAULT_SCHOOL_COLOR);
  // No accent means the main colour does both jobs.
  const accent = useColour(school.accentColor, main.value);
  const save = useWrite(
    (patch: {
      name: string;
      brandColor: string | null;
      accentColor: string | null;
    }) => api<School>('/school', { method: 'PATCH', body: patch }),
    [['school']],
  );
  const valid = isHex(main.value) && isHex(accent.value);
  const mainPreview = isHex(main.value) ? main.value : DEFAULT_SCHOOL_COLOR;
  const accentPreview = isHex(accent.value) ? accent.value : mainPreview;

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate({
      name,
      brandColor: main.saved(),
      accentColor: accent.saved(),
    });
  }

  return (
    <Section title="Name and colours">
      <form
        onSubmit={submit}
        className="flex flex-col gap-6 rounded-2xl bg-card p-5"
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
        <ColourPicker
          label="Main colour"
          colour={main}
          resetLabel="Use Dopple’s colour"
        />
        <ColourPicker
          label="Accent colour"
          colour={accent}
          resetLabel="Same as main colour"
        />
        <p className="-mt-3 text-[13px] text-fg-3">
          The main colour is for buttons and the sign-in page; the accent picks
          out highlights, like the menu and the stripe across the top.
        </p>
        <div
          aria-label="Preview"
          className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-line p-4"
        >
          <span
            className="flex size-9 items-center justify-center rounded-[10px] font-display text-lg font-bold"
            style={{ background: mainPreview, color: textOn(mainPreview) }}
            aria-hidden="true"
          >
            {name[0] ?? ''}
          </span>
          <span
            className="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-semibold"
            style={{ background: mainPreview, color: textOn(mainPreview) }}
          >
            Sign in
          </span>
          <span
            className="flex min-h-11 items-center gap-2.5 rounded-[10px] bg-raised pr-4 text-[15px] font-semibold"
            aria-hidden="true"
          >
            <span
              className="h-6 w-[3px] rounded-full"
              style={{ background: accentPreview }}
            />
            Timetable
          </span>
          <span className="flex h-2 w-28 overflow-hidden rounded-full">
            <span className="flex-[2]" style={{ background: mainPreview }} />
            <span className="flex-1" style={{ background: accentPreview }} />
          </span>
        </div>
        <ErrorNote error={save.error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending || !valid}>
            Save
          </Button>
          {save.isSuccess && !save.isPending && (
            <span className="text-sm text-fg-3">Saved.</span>
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
          <p className="text-sm text-fg-3">
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
        <p className="text-[13px] text-fg-3">
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
