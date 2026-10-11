import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Password sign-in, role checks and refresh-token rotation at one school. */
describe('Auth (e2e)', () => {
  const slug = `auth-${randomUUID().slice(0, 8)}`;
  const host = `${slug}.${process.env.PLATFORM_DOMAIN}`;
  const password = 'a-long-test-password';
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;

  beforeAll(async () => {
    await owner.connect();
    const { rows } = await owner.query<{ id: string }>(
      'insert into tenants (slug, name) values ($1, $1) returning id',
      [slug],
    );
    const hash = await hashPassword(password);
    for (const [email, role, status] of [
      ['teacher@example.test', 'teacher', 'active'],
      ['student@example.test', 'student', 'active'],
      ['gone@example.test', 'teacher', 'disabled'],
    ]) {
      await owner.query(
        `insert into users (tenant_id, email, name, role, status, password_hash)
         values ($1, $2, 'Test', $3, $4, $5)`,
        [rows[0].id, email, role, status, hash],
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    for (const table of ['refresh_tokens', 'users']) {
      await owner.query(
        `delete from ${table} where tenant_id = (select id from tenants where slug = $1)`,
        [slug],
      );
    }
    await owner.query('delete from tenants where slug = $1', [slug]);
    await owner.end();
  });

  const http = () => request(app.getHttpServer());
  const signIn = (email: string, pw = password) =>
    http()
      .post('/auth/sign-in')
      .set('Host', host)
      .send({ email, password: pw });
  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh').set('Host', host).send({ refreshToken });

  it('signs in case-insensitively and returns the user', async () => {
    const res = await signIn('Teacher@Example.test').expect(200);
    expect(res.body).toMatchObject({
      tokenType: 'Bearer',
      user: { email: 'teacher@example.test', role: 'teacher' },
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await http()
      .get('/auth/me')
      .set('Host', host)
      .auth(res.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body.email).toBe('teacher@example.test');
  });

  it('gives the same answer for a wrong password, an unknown email and a disabled user', async () => {
    const bodies = await Promise.all([
      signIn('teacher@example.test', 'wrong').expect(401),
      signIn('nobody@example.test').expect(401),
      signIn('gone@example.test').expect(401),
    ]);
    expect(new Set(bodies.map((r) => r.body.message))).toEqual(
      new Set(['Email or password is incorrect']),
    );
  });

  it('rejects malformed sign-in bodies', async () => {
    await http()
      .post('/auth/sign-in')
      .set('Host', host)
      .send({ email: 'x' })
      .expect(400);
  });

  it('requires a token by default and enforces roles', async () => {
    await http().get('/students').set('Host', host).expect(401);
    await http()
      .get('/students')
      .set('Host', host)
      .auth('garbage', { type: 'bearer' })
      .expect(401);

    const student = (await signIn('student@example.test').expect(200)).body
      .accessToken;
    await http()
      .get('/students')
      .set('Host', host)
      .auth(student, { type: 'bearer' })
      .expect(403);

    const teacher = (await signIn('teacher@example.test').expect(200)).body
      .accessToken;
    await http()
      .get('/students')
      .set('Host', host)
      .auth(teacher, { type: 'bearer' })
      .expect(200);
  });

  it('rotates refresh tokens and ends every session when an old one is reused', async () => {
    const first = (await signIn('teacher@example.test').expect(200)).body
      .refreshToken;
    const other = (await signIn('teacher@example.test').expect(200)).body
      .refreshToken;

    const second = (await refresh(first).expect(200)).body.refreshToken;
    expect(second).not.toBe(first);

    await refresh(first).expect(401); // reuse
    await refresh(second).expect(401); // the rotated token died with it
    await refresh(other).expect(401); // and so did the user's other session
  });

  it('signs out without affecting other sessions', async () => {
    const phone = (await signIn('teacher@example.test').expect(200)).body
      .refreshToken;
    const laptop = (await signIn('teacher@example.test').expect(200)).body
      .refreshToken;

    await http()
      .post('/auth/sign-out')
      .set('Host', host)
      .send({ refreshToken: phone })
      .expect(204);
    await refresh(phone).expect(401);
    await refresh(laptop).expect(200);
  });

  it('publishes the verification key on the platform host', async () => {
    const res = await http().get('/.well-known/jwks.json').expect(200);
    expect(res.body.keys[0]).toMatchObject({
      kty: 'OKP',
      crv: 'Ed25519',
      alg: 'EdDSA',
    });
    expect(res.body.keys[0]).not.toHaveProperty('d');
  });
});
