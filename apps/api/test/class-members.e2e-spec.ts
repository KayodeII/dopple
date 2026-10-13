import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Enrolments, subject teachers and linking students to their accounts. */
describe('Class members (e2e)', () => {
  const slug = `members-${randomUUID().slice(0, 8)}`;
  const host = `${slug}.${process.env.PLATFORM_DOMAIN}`;
  const password = 'a-long-test-password';
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const insert = async (sql: string, params: unknown[]) =>
    (await owner.query<{ id: string }>(`${sql} returning id`, params)).rows[0]
      .id;

  beforeAll(async () => {
    await owner.connect();
    const tenant = await insert(
      'insert into tenants (slug, name) values ($1, $1)',
      [slug],
    );
    const hash = await hashPassword(password);
    for (const role of ['admin', 'teacher', 'student']) {
      ids[role] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5)`,
        [tenant, `${role}@example.test`, `Test ${role}`, role, hash],
      );
    }
    const session = await insert(
      `insert into academic_sessions (tenant_id, name, starts_on, ends_on)
       values ($1, '2026/2027', '2026-09-07', '2027-07-23')`,
      [tenant],
    );
    const nextSession = await insert(
      `insert into academic_sessions (tenant_id, name, starts_on, ends_on)
       values ($1, '2027/2028', '2027-09-06', '2028-07-21')`,
      [tenant],
    );
    for (const [key, sessionId, name] of [
      ['jss1a', session, 'JSS 1A'],
      ['jss1b', session, 'JSS 1B'],
      ['jss2a', nextSession, 'JSS 2A'],
    ]) {
      ids[key] = await insert(
        `insert into classes (tenant_id, session_id, name, level) values ($1, $2, $3, 'JSS')`,
        [tenant, sessionId, name],
      );
    }
    for (const [key, last] of [
      ['ada', 'Okafor'],
      ['bayo', 'Ade'],
    ]) {
      ids[key] = await insert(
        `insert into students (tenant_id, admission_no, first_name, last_name)
         values ($1, $2, $3, $4)`,
        [tenant, key.toUpperCase(), key, last],
      );
    }
    ids.maths = await insert(
      `insert into subjects (tenant_id, name, code) values ($1, 'Mathematics', 'MTH')`,
      [tenant],
    );

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
      'enrolments',
      'class_subjects',
      'classes',
      'academic_sessions',
      'subjects',
      'students',
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
      put: (path: string, body: object = {}) =>
        http().put(path).set('Host', host).auth(tokens[role], auth).send(body),
      patch: (path: string, body: object) =>
        http()
          .patch(path)
          .set('Host', host)
          .auth(tokens[role], auth)
          .send(body),
      delete: (path: string) =>
        http().delete(path).set('Host', host).auth(tokens[role], auth),
    };
  };
  const admin = as('admin');
  const names = async (classId: string) =>
    (await admin.get(`/classes/${classId}/students`).expect(200)).body.map(
      (s: { firstName: string }) => s.firstName,
    );

  it('enrols students and lists them by surname', async () => {
    await admin.put(`/classes/${ids.jss1a}/students/${ids.ada}`).expect(204);
    await admin.put(`/classes/${ids.jss1a}/students/${ids.bayo}`).expect(204);
    await admin.put(`/classes/${ids.jss1a}/students/${ids.bayo}`).expect(204); // idempotent
    expect(await names(ids.jss1a)).toEqual(['bayo', 'ada']);
    const list = await as('teacher')
      .get(`/classes/${ids.jss1a}/students`)
      .expect(200);
    expect(list.body[0]).toEqual({
      id: ids.bayo,
      admissionNo: 'BAYO',
      firstName: 'bayo',
      lastName: 'Ade',
    });
  });

  it('moves a student within a session but keeps other sessions separate', async () => {
    await admin.put(`/classes/${ids.jss1b}/students/${ids.ada}`).expect(204);
    expect(await names(ids.jss1a)).toEqual(['bayo']);
    expect(await names(ids.jss1b)).toEqual(['ada']);

    await admin.put(`/classes/${ids.jss2a}/students/${ids.ada}`).expect(204);
    expect(await names(ids.jss1b)).toEqual(['ada']);
    expect(await names(ids.jss2a)).toEqual(['ada']);
  });

  it('unenrols, and rejects unknown classes and students', async () => {
    await admin.delete(`/classes/${ids.jss2a}/students/${ids.ada}`).expect(204);
    await admin.delete(`/classes/${ids.jss2a}/students/${ids.ada}`).expect(404);
    expect(await names(ids.jss2a)).toEqual([]);

    await admin.put(`/classes/${randomUUID()}/students/${ids.ada}`).expect(404);
    await admin
      .put(`/classes/${ids.jss1a}/students/${randomUUID()}`)
      .expect(422);
    await admin.get(`/classes/${randomUUID()}/students`).expect(404);
  });

  it('keeps class lists to staff and changes to admins', async () => {
    await as('student').get(`/classes/${ids.jss1a}/students`).expect(403);
    await as('teacher')
      .put(`/classes/${ids.jss1a}/students/${ids.ada}`)
      .expect(403);
    await as('teacher')
      .put(`/classes/${ids.jss1a}/subjects/${ids.maths}`)
      .expect(403);
  });

  it('assigns subjects and their teachers', async () => {
    await admin.put(`/classes/${ids.jss1a}/subjects/${ids.maths}`).expect(204);
    expect(
      (await as('student').get(`/classes/${ids.jss1a}/subjects`).expect(200))
        .body,
    ).toEqual([
      { id: ids.maths, name: 'Mathematics', code: 'MTH', teacher: null },
    ]);

    await admin
      .put(`/classes/${ids.jss1a}/subjects/${ids.maths}`, {
        teacherId: ids.teacher,
      })
      .expect(204);
    const [subject] = (
      await admin.get(`/classes/${ids.jss1a}/subjects`).expect(200)
    ).body;
    expect(subject.teacher).toEqual({ id: ids.teacher, name: 'Test teacher' });

    await admin
      .put(`/classes/${ids.jss1a}/subjects/${ids.maths}`, {
        teacherId: ids.student,
      })
      .expect(422);
    await admin
      .put(`/classes/${ids.jss1a}/subjects/${randomUUID()}`)
      .expect(422);

    await admin
      .delete(`/classes/${ids.jss1a}/subjects/${ids.maths}`)
      .expect(204);
    await admin
      .delete(`/classes/${ids.jss1a}/subjects/${ids.maths}`)
      .expect(404);
    expect(
      (await admin.get(`/classes/${ids.jss1a}/subjects`).expect(200)).body,
    ).toEqual([]);
  });

  it('links a student to their own account, once', async () => {
    const linked = await admin
      .patch(`/students/${ids.ada}`, { userId: ids.student })
      .expect(200);
    expect(linked.body.userId).toBe(ids.student);

    await admin
      .patch(`/students/${ids.bayo}`, { userId: ids.student })
      .expect(409);
    await admin
      .patch(`/students/${ids.bayo}`, { userId: ids.teacher })
      .expect(422);
    await admin
      .patch(`/students/${randomUUID()}`, { userId: null })
      .expect(404);
    await as('teacher')
      .patch(`/students/${ids.bayo}`, { userId: null })
      .expect(403);

    const unlinked = await admin
      .patch(`/students/${ids.ada}`, { userId: null })
      .expect(200);
    expect(unlinked.body.userId).toBeNull();
  });
});
