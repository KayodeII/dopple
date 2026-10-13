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
      'timetable_slots',
      'enrolments',
      'class_subjects',
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
        put: (path: string, body: object = {}) =>
          http()
            .put(path)
            .set('Host', host(slug))
            .auth(token, { type: 'bearer' })
            .send(body),
        patch: (path: string, body: object) =>
          http()
            .patch(path)
            .set('Host', host(slug))
            .auth(token, { type: 'bearer' })
            .send(body),
        delete: (path: string) =>
          http()
            .delete(path)
            .set('Host', host(slug))
            .auth(token, { type: 'bearer' }),
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

    // Enrolments, subject teachers and account links stay within the school too.
    const classA = (
      await a
        .post('/classes', {
          sessionId: sessionA.id,
          name: 'JSS 1A',
          level: 'JSS 1',
        })
        .expect(201)
    ).body;
    const studentId = async (slug: string, admissionNo: string) =>
      (
        await owner.query<{ id: string }>(
          `select s.id from students s join tenants t on t.id = s.tenant_id
           where t.slug = $1 and s.admission_no = $2`,
          [slug, admissionNo],
        )
      ).rows[0].id;
    const studentA = await studentId(schoolA, 'A-1');
    const studentB = await studentId(schoolB, 'B-1');
    const subjectB = (
      await b
        .post('/subjects', { name: 'Mathematics', code: 'MTH' })
        .expect(201)
    ).body;
    await b.put(`/classes/${classB.id}/students/${studentB}`).expect(204);
    await b.put(`/classes/${classB.id}/subjects/${subjectB.id}`).expect(204);

    await a.put(`/classes/${classA.id}/students/${studentB}`).expect(422);
    await b.put(`/classes/${classA.id}/students/${studentB}`).expect(404);
    await a.get(`/classes/${classB.id}/students`).expect(404);
    await a.get(`/classes/${classB.id}/subjects`).expect(404);
    await a.put(`/classes/${classA.id}/subjects/${subjectB.id}`).expect(422);
    await a.patch(`/students/${studentA}`, { userId: teacherB.id }).expect(422);

    // Timetables: another school's class, term or lessons cannot be read or used.
    const sessionWithTerm = (name: string) => ({
      name,
      startsOn: '2027-09-06',
      endsOn: '2028-07-21',
      terms: [
        {
          number: 1,
          name: 'First',
          startsOn: '2027-09-06',
          endsOn: '2027-12-10',
        },
      ],
    });
    const yearB = (
      await b.post('/sessions', sessionWithTerm('2027/2028')).expect(201)
    ).body;
    const yearA = (
      await a.post('/sessions', sessionWithTerm('2027/2028')).expect(201)
    ).body;
    const classInYear = async (
      client: typeof a,
      sessionId: string,
      subjectId: string,
    ) => {
      const created = (
        await client
          .post('/classes', { sessionId, name: 'JSS 2A', level: 'JSS 2' })
          .expect(201)
      ).body;
      await client
        .put(`/classes/${created.id}/subjects/${subjectId}`)
        .expect(204);
      return created.id as string;
    };
    const subjectA = (
      await a
        .post('/subjects', { name: 'Mathematics', code: 'MTH' })
        .expect(201)
    ).body;
    const timetableB = await classInYear(b, yearB.id, subjectB.id);
    const timetableA = await classInYear(a, yearA.id, subjectA.id);
    const lesson = (termId: string, subjectId: string) => ({
      termId,
      subjectId,
      weekday: 1,
      startsAt: '08:00',
      endsAt: '08:40',
    });
    const lessonB = (
      await b
        .post(
          `/classes/${timetableB}/timetable`,
          lesson(yearB.terms[0].id, subjectB.id),
        )
        .expect(201)
    ).body;
    await a
      .get(`/classes/${timetableB}/timetable?termId=${yearB.terms[0].id}`)
      .expect(404);
    expect(
      (await a.get(`/timetable/me?termId=${yearB.terms[0].id}`).expect(200))
        .body,
    ).toEqual([]);
    await a
      .post(
        `/classes/${timetableA}/timetable`,
        lesson(yearB.terms[0].id, subjectA.id),
      )
      .expect(422);
    await a
      .post(
        `/classes/${timetableA}/timetable`,
        lesson(yearA.terms[0].id, subjectB.id),
      )
      .expect(422);
    await a
      .post(
        `/classes/${timetableB}/timetable`,
        lesson(yearA.terms[0].id, subjectA.id),
      )
      .expect(404);
    await a
      .delete(`/classes/${timetableB}/timetable/${lessonB.id}`)
      .expect(404);
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
      'enrolments',
      'class_subjects',
      'timetable_slots',
    ]) {
      const { rows } = await appRole.query(`select * from ${table}`);
      expect(rows, table).toEqual([]);
    }
    await appRole.end();
  });
});
