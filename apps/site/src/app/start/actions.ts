'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/schools';

export interface StartSchoolState {
  error?: string;
  /** API validation messages by field name. */
  fields?: Record<string, string>;
}

const FIELDS = [
  'name',
  'slug',
  'city',
  'brandColor',
  'adminName',
  'adminEmail',
] as const;

/**
 * Creates the school through the API, then sends the new admin to their school's
 * own sign-in page. Public by design: the API validates and rate-limits sign-ups.
 */
export async function startSchool(
  _previous: StartSchoolState,
  form: FormData,
): Promise<StartSchoolState> {
  const body: Record<string, string> = {};
  for (const field of FIELDS) {
    const value = String(form.get(field) ?? '').trim();
    if (value) body[field] = value;
  }
  body.password = String(form.get('password') ?? '');

  let signInUrl: string;
  try {
    const res = await fetch(`${API_URL}/schools`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as {
      signInUrl?: string;
      message?: string | { field: string; message: string }[];
    } | null;
    if (!res.ok || !data?.signInUrl) {
      if (Array.isArray(data?.message)) {
        return {
          error: 'Please check the highlighted fields.',
          fields: Object.fromEntries(
            data.message.map((m) => [m.field, m.message]),
          ),
        };
      }
      if (res.status === 429) {
        return {
          error:
            'Too many schools were started from here recently. Try again in an hour.',
        };
      }
      return {
        error:
          typeof data?.message === 'string'
            ? data.message
            : 'Something went wrong. Please try again.',
        fields: res.status === 409 ? { slug: 'is already taken' } : undefined,
      };
    }
    signInUrl = data.signInUrl;
  } catch {
    return {
      error: 'We could not reach Dopple. Check your connection and try again.',
    };
  }
  // Outside the try: redirect() works by throwing.
  redirect(signInUrl);
}
