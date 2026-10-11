import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/**
 * The most important test in the repo: one school must never see another's rows.
 * Creates two throwaway schools as the owner role, then reads through the API
 * (which connects as dopple_app, so row-level security applies).
 */
describe('Tenant isolation (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const schoolA = `iso-a-${run}`;
  const schoolB = `iso-b-${run}`;
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;
  // The same email exists at both schools, with a different password at each.
  const email = 'shared@example.test';
  const passwords = { [schoolA]: 'password-a', [schoolB]: 'password-b' };

  beforeAll(async () => {
    await owner.connect();
    for (const [slug, students] of [
      [schoolA, ['A-1', 'A-2']],
      [schoolB, ['B-1']],
    ] as const) {
      const { rows } = await owner.query<{ id: string }>(
        'insert into tenants (slug, name) values ($1, $1) returning id',
        [slug],
      );
      await owner.query(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, 'Test', 'admin', $3)`,
        [rows[0].id, email, await hashPassword(passwords[slug])],
      );
      for (const admissionNo of students) {
        await owner.query(
          `insert into students (tenant_id, admission_no, first_name, last_name)
           values ($1, $2, 'Test', $2)`,
          [rows[0].id, admissionNo],
        );
      }
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    // Children before parents: these tables reference each other.
    for (const table of [
      'classes',
      'terms',
      'academic_sessions',
      'subjects',
      'refresh_tokens',
      'users',
      'students',
    ]) {
      await owner.query(
        `delete from ${table} where tenant_id in (select id from tenants where slug = any($1))`,
        [[schoolA, schoolB]],
      );
    }
    await owner.query('delete from tenants where slug = any($1)', [
      [schoolA, schoolB],
    ]);
    await owner.end();
  });

  const host = (slug: string) => `${slug}.${process.env.PLATFORM_DOMAIN}`;

  const signIn = (slug: string, password: string) =>
    request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('Host', host(slug))
      .send({ email, password });

  const tokenFor = async (slug: string) =>
    (await signIn(slug, passwords[slug]).expect(200)).body
      .accessToken as string;

  const studentsAt = async (slug: string) => {
    const token = await tokenFor(slug);
    const res = await request(app.getHttpServer())
      .get('/students')
      .set('Host', host(slug))
      .auth(token, { type: 'bearer' })
      .expect(200);
    return (res.body as { admissionNo: string }[]).map((s) => s.admissionNo);
  };

  it('returns only the requesting school’s students', async () => {
    expect((await studentsAt(schoolA)).sort()).toEqual(['A-1', 'A-2']);
    expect(await studentsAt(schoolB)).toEqual(['B-1']);
  });

  it('signs in against the school at the host only', async () => {
    await signIn(schoolA, passwords[schoolA]).expect(200);
    await signIn(schoolA, passwords[schoolB]).expect(401);
    await signIn(schoolB, passwords[schoolA]).expect(401);
  });

  it('rejects a token from one school on another school’s host', async () => {
    const token = await tokenFor(schoolA);
    await request(app.getHttpServer())
      .get('/students')
      .set('Host', host(schoolB))
      .auth(token, { type: 'bearer' })
      .expect(401);
  });

  it('does not accept a refresh token at another school', async () => {
    const { refreshToken } = (
      await signIn(schoolA, passwords[schoolA]).expect(200)
    ).body;
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Host', host(schoolB))
      .send({ refreshToken })
      .expect(401);
    // ...and that attempt did not burn it at its own school.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Host', host(schoolA))
      .send({ refreshToken })
      .expect(200);
  });

  it('does not show or link another school’s classes, sessions or staff', async () => {
    const as = async (slug: string) => {
      const token = await tokenFor(slug);
      const http = () => request(app.getHttpServer());
      return {
        get: (path: string) =>
          http()
            .get(path)
            .set('Host', host(slug))
            .auth(token, { type: 'bearer' }),
        post: (path: string, body: object) =>
          http()
            .post(path)
            .set('Host', host(slug))
            .auth(token, { type: 'bearer' })
            .send(body),
      };
    };
    const a = await as(schoolA);
    const b = await as(schoolB);

    const sessionB = (
      await b
        .post('/sessions', {
          name: '2026/2027',
          startsOn: '2026-09-07',
          endsOn: '2027-07-23',
        })
        .expect(201)
    ).body;
    const teacherB = (await b.get('/auth/me').expect(200)).body;
    const classB = (
      await b
        .post('/classes', {
          sessionId: sessionB.id,
          name: 'JSS 1A',
          level: 'JSS 1',
        })
        .expect(201)
    ).body;

    expect((await a.get('/sessions').expect(200)).body).toEqual([]);
    expect((await a.get('/classes').expect(200)).body).toEqual([]);
    await a.get(`/classes/${classB.id}`).expect(404);

    // References are checked within the school: another school's ids look missing.
    await a
      .post('/classes', {
        sessionId: sessionB.id,
        name: 'JSS 1A',
        level: 'JSS 1',
      })
      .expect(422);
    const sessionA = (
      await a
        .post('/sessions', {
          name: '2026/2027',
          startsOn: '2026-09-07',
          endsOn: '2027-07-23',
        })
        .expect(201)
    ).body;
    await a
      .post('/classes', {
        sessionId: sessionA.id,
        name: 'JSS 1A',
        level: 'JSS 1',
        formTeacherId: teacherB.id,
      })
      .expect(422);
  });

  it('returns nothing when no tenant is set on the connection', async () => {
    const appRole = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await appRole.connect();
    for (const table of [
      'students',
      'users',
      'refresh_tokens',
      'academic_sessions',
      'terms',
      'subjects',
      'classes',
    ]) {
      const { rows } = await appRole.query(`select * from ${table}`);
      expect(rows, table).toEqual([]);
    }
    await appRole.end();
  });
});
