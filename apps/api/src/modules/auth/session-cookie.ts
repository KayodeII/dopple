import type { CookieOptions, Request, Response } from 'express';

/**
 * Browser sessions (ADR 0008). The web app sends `X-Dopple-Session: cookie`; the
 * refresh token then travels only in this HttpOnly cookie, out of reach of page
 * scripts. `__Host-` makes browsers insist on Secure, Path=/ and no Domain, so
 * the cookie belongs to exactly one school's host.
 */
export const REFRESH_COOKIE = '__Host-dopple_refresh';

const options: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
};

/**
 * Also the CSRF defence: a cross-site form cannot set a custom header, and a
 * cross-origin fetch that does would need a CORS preflight the API never grants.
 */
export const wantsCookie = (req: Request) =>
  req.get('x-dopple-session') === 'cookie';

export function readRefreshCookie(req: Request): string | undefined {
  for (const pair of (req.headers.cookie ?? '').split(';')) {
    const at = pair.indexOf('=');
    if (at > 0 && pair.slice(0, at).trim() === REFRESH_COOKIE) {
      return decodeURIComponent(pair.slice(at + 1).trim()) || undefined;
    }
  }
  return undefined;
}

export const setRefreshCookie = (
  res: Response,
  token: string,
  maxAgeMs: number,
) => res.cookie(REFRESH_COOKIE, token, { ...options, maxAge: maxAgeMs });

export const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE, options);
