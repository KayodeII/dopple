import type { Request } from 'express';
import { readRefreshCookie, wantsCookie } from './session-cookie.js';

const request = (headers: Record<string, string>) =>
  ({
    headers,
    get: (name: string) => headers[name.toLowerCase()],
  }) as unknown as Request;

describe('session cookie', () => {
  it('reads the refresh cookie among others', () => {
    expect(
      readRefreshCookie(
        request({
          cookie: 'theme=dark; __Host-dopple_refresh=abc-123_x ; a=b',
        }),
      ),
    ).toBe('abc-123_x');
  });

  it('ignores missing, empty and look-alike cookies', () => {
    expect(readRefreshCookie(request({}))).toBeUndefined();
    expect(
      readRefreshCookie(request({ cookie: '__Host-dopple_refresh=' })),
    ).toBeUndefined();
    expect(
      readRefreshCookie(
        request({ cookie: 'dopple_refresh=abc; x__Host-dopple_refresh=def' }),
      ),
    ).toBeUndefined();
  });

  it('uses cookies only when the request asks for them', () => {
    expect(wantsCookie(request({ 'x-dopple-session': 'cookie' }))).toBe(true);
    expect(wantsCookie(request({ 'x-dopple-session': 'token' }))).toBe(false);
    expect(wantsCookie(request({}))).toBe(false);
  });
});
