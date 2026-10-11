import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Sessions, terms, subjects and classes at one school. */
describe('School structure (e2e)', () => {
  const slug = `struct-${randomUUID().slice(0, 8)}`;
  const host = `${slug}.${process.env.PLATFORM_DOMAIN}`;
  const password = 'a-long-test-password';
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  const year = {
    name: '2026/2027',
    startsOn: '2026-09-07',
    endsOn: '2027-07-23',
    terms: [
      {
        number: 2,
        name: 'Second term',
        startsOn: '2027-01-11',
        endsOn: '2027-04-02',
      },
      {
        number: 1,
        name: 'First term',
        startsOn: '2026-09-07',
        endsOn: '2026-12-11',
      },
    ],
  };

  beforeAll(async () => {
    await owner.connect();
    const { rows } = await owner.query<{ id: string }>(
      'insert into tenants (slug, name) values ($1, $1) returning id',
      [slug],
    );
    const hash = await hashPassword(password);
    for (const role of ['admin', 'teacher', 'student']) {
      const user = await owner.query<{ id: string }>(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5) returning id`,
        [rows[0].id, `${role}@example.test`, `Test ${role}`, role, hash],
      );
      userIds[role] = user.rows[0].id;
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    for (const role of ['admin', 'teacher', 'student']) {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('Host', host)
        .send({ email: `${role}@example.test`, password })
        .expect(200);
      tokens[role] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
    for (const table of [
      'classes',
      'terms',
      'academic_sessions',
      'subjects',
      'refresh_tokens',
      'users',
    ]) {
      await owner.query(
        `delete from ${table} where tenant_id = (select id from tenants where slug = $1)`,
        [slug],
      );
    }
    await owner.query('delete from tenants where slug = $1', [slug]);
    await owner.end();
  });

  const as = (role: string) => {
    const http = () => request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    return {
      get: (path: string) =>
        http().get(path).set('Host', host).auth(tokens[role], auth),
      post: (path: string, body: object) =>
        http().post(path).set('Host', host).auth(tokens[role], auth).send(body),
      patch: (path: string, body: object) =>
        http()
          .patch(path)
          .set('Host', host)
          .auth(tokens[role], auth)
          .send(body),
    };
  };
  const admin = as('admin');

  let sessionId: string;

  it('creates a session with its terms in order', async () => {
    const res = await admin.post('/sessions', year).expect(201);
    sessionId = res.body.id;
    expect(res.body).toMatchObject({
      name: '2026/2027',
      startsOn: '2026-09-07',
    });
    expect(res.body.terms.map((t: { number: number }) => t.number)).toEqual([
      1, 2,
    ]);
    expect(res.body).not.toHaveProperty('tenantId');

    const list = await as('student').get('/sessions').expect(200);
    expect(list.body).toEqual([res.body]);
  });

  it('rejects duplicate and invalid sessions', async () => {
    await admin.post('/sessions', year).expect(409);
    const bad = await admin
      .post('/sessions', {
        ...year,
        name: 'Bad',
        endsOn: '2026-01-01',
        terms: [],
      })
      .expect(400);
    expect(bad.body.message).toEqual([
      { field: 'endsOn', message: 'must be after startsOn' },
    ]);
  });

  it('lets only admins change the school structure', async () => {
    await as('teacher')
      .post('/subjects', { name: 'Biology', code: 'BIO' })
      .expect(403);
    await as('teacher')
      .post('/sessions', { ...year, name: 'Other' })
      .expect(403);
    await as('student')
      .post('/classes', { sessionId, name: 'X', level: 'X' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/subjects')
      .set('Host', host)
      .expect(401);
  });

  it('creates subjects with upper-case unique codes', async () => {
    const res = await admin
      .post('/subjects', { name: 'Mathematics', code: ' mth ' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Mathematics', code: 'MTH' });
    await admin
      .post('/subjects', { name: 'Maths again', code: 'MTH' })
      .expect(409);
    await admin
      .post('/subjects', { name: 'Bad', code: 'no spaces' })
      .expect(400);
    expect(
      (await as('teacher').get('/subjects').expect(200)).body,
    ).toHaveLength(1);
  });

  it('creates classes with a form teacher who must be staff', async () => {
    const created = await admin
      .post('/classes', {
        sessionId,
        name: 'JSS 1A',
        level: 'JSS 1',
        formTeacherId: userIds.teacher,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'JSS 1A',
      level: 'JSS 1',
      sessionId,
      formTeacher: { id: userIds.teacher, name: 'Test teacher' },
    });

    await admin
      .post('/classes', {
        sessionId,
        name: 'JSS 1B',
        level: 'JSS 1',
        formTeacherId: userIds.student,
      })
      .expect(422);
    await admin
      .post('/classes', {
        sessionId: randomUUID(),
        name: 'JSS 1B',
        level: 'JSS 1',
      })
      .expect(422);
    await admin
      .post('/classes', { sessionId, name: 'JSS 1A', level: 'JSS 1' })
      .expect(409);
  });

  it('allows the same class name in another session and filters by session', async () => {
    const next = (
      await admin
        .post('/sessions', {
          name: '2027/2028',
          startsOn: '2027-09-06',
          endsOn: '2028-07-21',
        })
        .expect(201)
    ).body;
    await admin
      .post('/classes', { sessionId: next.id, name: 'JSS 1A', level: 'JSS 1' })
      .expect(201);

    expect((await as('teacher').get('/classes').expect(200)).body).toHaveLength(
      2,
    );
    const filtered = await as('teacher')
      .get(`/classes?sessionId=${next.id}`)
      .expect(200);
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0]).toMatchObject({
      sessionId: next.id,
      formTeacher: null,
    });
    await as('teacher').get('/classes?sessionId=not-a-uuid').expect(400);
  });

  it('updates and reads a single class', async () => {
    const [jss1a] = (
      await admin.get(`/classes?sessionId=${sessionId}`).expect(200)
    ).body;

    const updated = await admin
      .patch(`/classes/${jss1a.id}`, {
        name: 'JSS 1 Gold',
        formTeacherId: null,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      id: jss1a.id,
      name: 'JSS 1 Gold',
      formTeacher: null,
    });
    expect(
      (await as('student').get(`/classes/${jss1a.id}`).expect(200)).body,
    ).toEqual(updated.body);

    await admin.patch(`/classes/${jss1a.id}`, {}).expect(400);
    await admin.patch(`/classes/${randomUUID()}`, { name: 'Nope' }).expect(404);
    await admin.get(`/classes/${randomUUID()}`).expect(404);
    await admin.get('/classes/not-a-uuid').expect(400);
  });
});
