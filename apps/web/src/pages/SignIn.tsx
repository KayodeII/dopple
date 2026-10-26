import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { PoweredByDopple } from '../components/DoppleMark';
import { Button, ErrorNote, Field } from '../components/ui';
import { useSchool } from '../lib/queries';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';

/**
 * Sign-in for the school at this address. Accounts belong to one school (ADR 0004).
 * The school's colour, name and logo lead; Dopple signs off underneath.
 */
export function SignIn() {
  const { state, signIn } = useSession();
  const school = useSchool();
  const [params] = useSearchParams();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === 'signed-in') {
    const next = params.get('next');
    // Only local paths, so a crafted link cannot send people to another site.
    return (
      <Navigate
        to={next?.startsWith('/') && !next.startsWith('//') ? next : '/'}
        replace
      />
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signIn(String(form.get('email')), String(form.get('password')));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-ground md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <SchoolPanel />

      <section className="flex flex-col px-4 pt-4 pb-6 sm:px-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="flex w-full max-w-[400px] animate-rise flex-col gap-7">
            <div>
              <p className="font-mono text-[13px] text-fg-3">Welcome back</p>
              <h1 className="mt-2 font-display text-[clamp(28px,3vw,34px)] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
                {school.data ? `Sign in to ${school.data.name}` : 'Sign in'}
              </h1>
            </div>
            {params.get('welcome') && (
              <p className="rounded-xl border border-edge bg-card px-4 py-3 text-[15px] text-fg-2">
                Your school is ready. Sign in with the password you just chose.
              </p>
            )}
            {school.isError ? (
              <ErrorNote error={school.error} />
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  defaultValue={params.get('email') ?? ''}
                  required
                />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <ErrorNote error={error} />
                <Button
                  type="submit"
                  className="mt-2"
                  disabled={busy || state.status === 'loading'}
                >
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}
            <p className="text-[13px] text-fg-3">
              Forgot your password or need an account? Ask your school’s office.
            </p>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3">
          <PoweredByDopple />
          <span className="font-mono text-[12px] text-fg-3">
            {window.location.hostname}
          </span>
        </footer>
      </section>
    </main>
  );
}

/** The school's side: its colours, logo (or first letter) and name, with the Dopple circles as texture. */
function SchoolPanel() {
  const school = useSchool().data;
  // With an accent, the circles and badge carry it; without, they stay a faint tint.
  const accented = Boolean(school?.accentColor);
  return (
    <aside className="relative isolate flex flex-col justify-between gap-8 overflow-hidden bg-school px-6 py-7 text-on-school md:px-12 md:py-12">
      <LinkedCircles accented={accented} />
      {school?.logoUrl ? (
        <img
          src={school.logoUrl}
          alt={`${school.name} logo`}
          className="size-14 rounded-2xl bg-paper object-contain p-1 md:size-16"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`flex size-14 items-center justify-center rounded-2xl font-display text-3xl font-bold md:size-16 ${
            accented ? 'bg-accent text-on-accent' : 'bg-on-school/15'
          }`}
        >
          {school?.name[0] ?? ''}
        </span>
      )}
      <div className="max-w-[16ch]">
        <p className="font-display text-[clamp(30px,5vw,64px)] leading-[0.98] font-bold tracking-[-0.04em] text-balance">
          {school?.name ?? '\u00a0'}
        </p>
        <span
          aria-hidden="true"
          className={`mt-5 block h-1.5 w-16 rounded-full ${
            accented ? 'bg-accent' : 'bg-on-school/40'
          }`}
        />
        {school?.city && (
          <p className="mt-4 font-mono text-[13px] text-on-school/75">
            {school.city}
          </p>
        )}
      </div>
    </aside>
  );
}

/** The Dopple mark's two circles, blown up, so the school's page still feels like Dopple. */
function LinkedCircles({ accented }: { accented: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 100"
      fill="none"
      className="pointer-events-none absolute -right-20 -bottom-16 -z-10 w-[300px] text-on-school md:-top-28 md:-right-32 md:bottom-auto md:w-[600px]"
    >
      <circle
        cx="52"
        cy="50"
        r="36"
        className={accented ? 'fill-accent' : 'fill-current'}
        opacity={accented ? 0.9 : 0.09}
      />
      <circle
        cx="108"
        cy="50"
        r="36"
        stroke="currentColor"
        strokeWidth="5"
        opacity="0.16"
      />
    </svg>
  );
}

/** One tap between light and dark before signing in; Settings has the full choice. */
function ThemeToggle() {
  const [, setTheme] = useTheme();
  const dark = document.documentElement.dataset.theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
      className="flex size-11 items-center justify-center rounded-full text-fg-2 hover:bg-raised"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {dark ? (
          <>
            <circle cx="9" cy="9" r="3.5" />
            <path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.7 3.7l1 1M13.3 13.3l1 1M3.7 14.3l1-1M13.3 4.7l1-1" />
          </>
        ) : (
          <path d="M15 10.5A6.5 6.5 0 017.5 3a6.5 6.5 0 107.5 7.5z" />
        )}
      </svg>
    </button>
  );
}
