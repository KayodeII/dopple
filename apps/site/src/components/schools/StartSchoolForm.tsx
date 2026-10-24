'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { startSchool, type StartSchoolState } from '@/app/start/actions';
import { startSchool as copy } from '@/lib/content';
import { suggestAddress, type Availability } from '@/lib/schools';

const input =
  'min-h-12 w-full rounded-xl border border-rule-strong bg-white px-4 text-[16px] text-ink placeholder:text-soft focus:border-ink focus:outline-none aria-[invalid=true]:border-coral';

/** Self-serve sign-up. Fields stay controlled so nothing is lost when the API refuses. */
export function StartSchoolForm({ domain }: { domain: string }) {
  const [state, action, pending] = useActionState<StartSchoolState, FormData>(
    startSchool,
    {},
  );
  const [values, setValues] = useState({
    name: '',
    slug: '',
    city: '',
    brandColor: '#2f7a55',
    adminName: '',
    adminEmail: '',
    password: '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const availability = useAvailability(values.slug);
  const set =
    (field: keyof typeof values) => (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  const fieldError = (field: string) => state.fields?.[field];

  return (
    <form action={action} className="flex flex-col gap-8" noValidate={false}>
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-display text-xl font-bold">
          {copy.schoolHeading}
        </legend>
        <Field label={copy.fields.name} error={fieldError('name')}>
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(e) => {
              const name = e.target.value;
              setValues((v) => ({
                ...v,
                name,
                slug: slugEdited ? v.slug : suggestAddress(name),
              }));
            }}
            className={input}
            aria-invalid={!!fieldError('name')}
          />
        </Field>
        <Field
          label={copy.fields.slug}
          error={fieldError('slug')}
          hint={
            <AddressStatus
              slug={values.slug}
              domain={domain}
              availability={availability}
            />
          }
        >
          <div className="flex items-stretch overflow-hidden rounded-xl border border-rule-strong bg-white focus-within:border-ink">
            <input
              name="slug"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
              value={values.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setValues((v) => ({
                  ...v,
                  slug: e.target.value.toLowerCase(),
                }));
              }}
              className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-[16px] focus:outline-none"
              aria-invalid={
                !!fieldError('slug') || availability?.available === false
              }
              autoCapitalize="none"
              spellCheck={false}
            />
            <span className="flex items-center bg-paper px-3 font-mono text-[14px] text-muted">
              .{domain}
            </span>
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <Field label={copy.fields.city} error={fieldError('city')}>
            <input
              name="city"
              maxLength={80}
              value={values.city}
              onChange={set('city')}
              className={input}
            />
          </Field>
          <Field
            label={copy.fields.brandColor}
            error={fieldError('brandColor')}
          >
            <input
              name="brandColor"
              type="color"
              value={values.brandColor}
              onChange={set('brandColor')}
              className="h-12 w-20 cursor-pointer rounded-xl border border-rule-strong bg-white p-1"
            />
          </Field>
        </div>
        <p className="-mt-2 text-sm text-muted">{copy.colourHint}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-display text-xl font-bold">
          {copy.adminHeading}
        </legend>
        <Field label={copy.fields.adminName} error={fieldError('adminName')}>
          <input
            name="adminName"
            required
            maxLength={80}
            autoComplete="name"
            value={values.adminName}
            onChange={set('adminName')}
            className={input}
          />
        </Field>
        <Field label={copy.fields.adminEmail} error={fieldError('adminEmail')}>
          <input
            name="adminEmail"
            type="email"
            required
            autoComplete="email"
            value={values.adminEmail}
            onChange={set('adminEmail')}
            className={input}
          />
        </Field>
        <Field
          label={copy.fields.password}
          error={fieldError('password')}
          hint={copy.passwordHint}
        >
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={values.password}
            onChange={set('password')}
            className={input}
          />
        </Field>
      </fieldset>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-coral/50 bg-white px-4 py-3 text-[15px] text-danger"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || availability?.available === false}
        className="inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-7 text-base font-semibold text-paper hover:bg-graphite disabled:opacity-50"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-[15px] font-semibold">
      {label}
      {children}
      {error ? (
        <span className="text-sm font-normal text-danger">
          {label} {error}
        </span>
      ) : hint ? (
        <span className="text-sm font-normal text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** Asks the API whether the address is free, a moment after typing stops. */
function useAvailability(slug: string): Availability | null {
  const [result, setResult] = useState<Availability | null>(null);
  useEffect(() => {
    // A stale answer is hidden below by comparing slugs, so nothing to reset here.
    if (slug.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/schools/availability?slug=${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          },
        );
        if (res.ok) setResult((await res.json()) as Availability);
      } catch {
        // Unknown: the API still checks on submit.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);
  return result?.slug === slug ? result : null;
}

function AddressStatus({
  slug,
  domain,
  availability,
}: {
  slug: string;
  domain: string;
  availability: Availability | null;
}) {
  if (!slug) return <>Where your school will live, e.g. greenfield.{domain}</>;
  if (!availability) return <>{`${slug}.${domain}`}</>;
  return availability.available ? (
    <span className="text-ok">{`${slug}.${domain} is free`}</span>
  ) : (
    <span className="text-danger">{`${slug}.${domain} ${availability.reason}`}</span>
  );
}
