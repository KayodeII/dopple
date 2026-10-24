import type { User } from './types';

/**
 * Talks to the API on the same origin (/api, see vite.config.ts) and keeps the
 * session. The access token lives in memory only; the refresh token is an
 * HttpOnly cookie this code never sees (ADR 0008).
 */

const COOKIE_SESSION = { 'X-Dopple-Session': 'cookie' };

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: FieldError[] = [],
  ) {
    super(message);
  }
}

/** The API answers errors as { message: string } or, for validation, { message: FieldError[] }. */
export function errorFrom(status: number, body: unknown): ApiError {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) {
    const fields = message as FieldError[];
    return new ApiError(
      status,
      fields
        .map((f) => (f.field ? `${f.field}: ${f.message}` : f.message))
        .join('. '),
      fields,
    );
  }
  return new ApiError(
    status,
    typeof message === 'string' ? message : `Something went wrong (${status})`,
  );
}

let accessToken: string | null = null;
let refreshing: Promise<User | null> | null = null;
const endedListeners = new Set<() => void>();

/** Called when the session can no longer be renewed, so the app can show sign-in. */
export function onSessionEnded(listener: () => void) {
  endedListeners.add(listener);
  return () => endedListeners.delete(listener);
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

async function startSession(res: Response): Promise<User> {
  const body = (await readJson(res)) as { accessToken: string; user: User };
  accessToken = body.accessToken;
  return body.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { ...COOKIE_SESSION, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw errorFrom(res.status, await readJson(res));
  return startSession(res);
}

/**
 * Swaps the refresh cookie for a new access token, or null if signed out.
 * Refresh tokens work once, so two refreshes racing with the same cookie would
 * look like theft and end the session: one call at a time in this tab, and a Web
 * Lock so other tabs of the same school wait their turn (and then send the
 * cookie the first one received).
 */
export function refreshSession(): Promise<User | null> {
  refreshing ??= withLock(async () => {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: COOKIE_SESSION,
    });
    if (!res.ok) {
      accessToken = null;
      return null;
    }
    return startSession(res);
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function withLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? navigator.locks.request('dopple-session-refresh', task)
    : task();
}

export async function signOut(): Promise<void> {
  accessToken = null;
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    headers: COOKIE_SESSION,
  });
}

/** A school-scoped API call. Renews the access token once on 401. A Blob body is sent as is (uploads). */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await request(path, options);
  const data = await readJson(res);
  if (!res.ok) throw errorFrom(res.status, data);
  return data as T;
}

/** An image or other file the API serves privately; null if there is none (404). */
export async function apiBlob(path: string): Promise<Blob | null> {
  const res = await request(path, {});
  if (res.status === 404) return null;
  if (!res.ok) throw errorFrom(res.status, await readJson(res));
  return res.blob();
}

async function request(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown },
): Promise<Response> {
  const raw = body instanceof Blob;
  const send = () =>
    fetch(`/api${path}`, {
      method,
      headers: {
        ...(body === undefined
          ? {}
          : { 'content-type': raw ? body.type : 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });

  let res = await send();
  if (res.status === 401) {
    if (await refreshSession()) {
      res = await send();
    } else {
      endedListeners.forEach((listener) => listener());
    }
  }
  return res;
}
