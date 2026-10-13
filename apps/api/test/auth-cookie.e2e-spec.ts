import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Browser sessions: the refresh token lives in an HttpOnly cookie (ADR 0008). */
describe('Cookie sessions (e2e)', () => {
  const slug = `cookie-${randomUUID().slice(0, 8)}`;
  const host = `${slug}.${process.env.PLATFORM_DOMAIN}`;
  const email = 'staff@example.test';
  const password = 'a-long-test-password';
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;
  let tenantId: string;

  beforeAll(async () => {
    await owner.connect();
    tenantId = (
      await owner.query<{ id: string }>(
        'insert into tenants (slug, name) values ($1, $1) returning id',
        [slug],
      )
    ).rows[0].id;
    await owner.query(
      `insert into users (tenant_id, email, name, role, password_hash)
       values ($1, $2, 'Staff', 'teacher', $3)`,
      [tenantId, email, await hashPassword(password)],
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    for (const table of ['refresh_tokens', 'users']) {
      await owner.query(`delete from ${table} where tenant_id = $1`, [
        tenantId,
      ]);
    }
    await owner.query('delete from tenants where id = $1', [tenantId]);
    await owner.end();
  });

  const web = { 'X-Dopple-Session': 'cookie' };
  const post = (path: string, headers: Record<string, string> = {}) =>
    request(app.getHttpServer()).post(path).set('Host', host).set(headers);
  const setCookie = (res: request.Response) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  /** The name=value part a browser would send back. */
  const cookieOf = (res: request.Response) => setCookie(res)[0]?.split(';')[0];
  const signIn = () => post('/auth/sign-in', web).send({ email, password });

  it('sets an HttpOnly, Secure, SameSite=Strict host cookie and leaves the token out of the body', async () => {
    const res = await signIn().expect(200);
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    const [cookie] = setCookie(res);
    expect(cookie).toMatch(/^__Host-dopple_refresh=[\w-]{43};/);
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    expect(cookie).not.toContain('Domain=');
  });

  it('rotates the cookie on refresh, and refuses a used one', async () => {
    const first = cookieOf(await signIn().expect(200));
    const refreshed = await post('/auth/refresh', web)
      .set('Cookie', first)
      .expect(200);
    expect(refreshed.body.refreshToken).toBeUndefined();
    const second = cookieOf(refreshed);
    expect(second).not.toBe(first);

    // Replaying the first cookie is token reuse: refused, cleared, and every session ends.
    const replay = await post('/auth/refresh', web)
      .set('Cookie', first)
      .expect(401);
    expect(setCookie(replay)[0]).toMatch(
      /^__Host-dopple_refresh=;.*Expires=Thu, 01 Jan 1970/,
    );
    await post('/auth/refresh', web).set('Cookie', second).expect(401);
  });

  it('ignores the cookie unless the request asks for cookie sessions', async () => {
    const cookie = cookieOf(await signIn().expect(200));
    // What a cross-site form post would look like: the cookie, but no custom header.
    await post('/auth/refresh').set('Cookie', cookie).expect(401);
    // ...and it did not use up the token.
    await post('/auth/refresh', web).set('Cookie', cookie).expect(200);
    await post('/auth/refresh', web).expect(401);
  });

  it('signs out by deleting the session and clearing the cookie', async () => {
    const cookie = cookieOf(await signIn().expect(200));
    const res = await post('/auth/sign-out', web)
      .set('Cookie', cookie)
      .expect(204);
    expect(setCookie(res)[0]).toMatch(/^__Host-dopple_refresh=;/);
    await post('/auth/refresh', web).set('Cookie', cookie).expect(401);
  });

  it('keeps body tokens working for other clients', async () => {
    const res = await post('/auth/sign-in')
      .send({ email, password })
      .expect(200);
    expect(setCookie(res)).toEqual([]);
    const { refreshToken } = res.body;
    const next = await post('/auth/refresh').send({ refreshToken }).expect(200);
    expect(next.body.refreshToken).toEqual(expect.any(String));
    await post('/auth/sign-out')
      .send({ refreshToken: next.body.refreshToken })
      .expect(204);
  });
});
