import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { SchoolBadge } from '../components/SchoolTheme';
import { Button, ErrorNote, Field } from '../components/ui';
import { useSchool } from '../lib/queries';
import { useSession } from '../lib/session';

/** Sign-in for the school at this address. Accounts belong to one school (ADR 0004). */
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
    <main className="flex min-h-screen items-center justify-center bg-ground px-4 py-12">
      <div className="flex w-full max-w-[400px] flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <SchoolBadge size="lg" />
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.03em]">
              {school.data ? `Sign in to ${school.data.name}` : 'Sign in'}
            </h1>
            <p className="mt-1 font-mono text-[13px] text-soft">
              {window.location.hostname}
            </p>
          </div>
        </div>
        {params.get('welcome') && (
          <p className="rounded-xl bg-card px-4 py-3 text-[15px] text-sand">
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
            <Button type="submit" disabled={busy || state.status === 'loading'}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
