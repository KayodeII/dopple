import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
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
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-school font-display text-2xl font-bold text-white"
          >
            {school.data?.name[0] ?? ''}
          </span>
          <div>
            <h1 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.03em]">
              {school.data ? `Sign in to ${school.data.name}` : 'Sign in'}
            </h1>
            <p className="mt-1 font-mono text-[13px] text-soft">
              {window.location.hostname}
            </p>
          </div>
        </div>
        {school.isError ? (
          <ErrorNote error={school.error} />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
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
