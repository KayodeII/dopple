import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Adding, editing, searching and reading student records. */
describe('Students (e2e)', () => {
  const slug = `students-${randomUUID().slice(0, 8)}`;
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
    ids.tenant = await insert(
      'insert into tenants (slug, name) values ($1, $1)',
      [slug],
    );
    const hash = await hashPassword(password);
    for (const role of ['admin', 'teacher', 'student']) {
      ids[role] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5)`,
        [ids.tenant, `${role}@example.test`, `Test ${role}`, role, hash],
      );
    }
    for (const [key, name, starts, ends] of [
      ['older', '2025/2026', '2025-09-08', '2026-07-24'],
      ['newer', '2026/2027', '2026-09-07', '2027-07-23'],
    ]) {
      ids[key] = await insert(
        `insert into academic_sessions (tenant_id, name, starts_on, ends_on)
         values ($1, $2, $3, $4)`,
        [ids.tenant, name, starts, ends],
      );
      ids[`${key}Class`] = await insert(
        `insert into classes (tenant_id, session_id, name, level) values ($1, $2, $3, 'JSS')`,
        [ids.tenant, ids[key], key === 'older' ? 'JSS 1A' : 'JSS 2A'],
      );
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
      'enrolments',
      'classes',
      'academic_sessions',
      'students',
      'refresh_tokens',
      'users',
    ]) {
      await owner.query(`delete from ${table} where tenant_id = $1`, [
        ids.tenant,
      ]);
    }
    await owner.query('delete from tenants where id = $1', [ids.tenant]);
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
      put: (path: string) =>
        http().put(path).set('Host', host).auth(tokens[role], auth),
      patch: (path: string, body: object) =>
        http()
          .patch(path)
          .set('Host', host)
          .auth(tokens[role], auth)
          .send(body),
    };
  };
  const admin = as('admin');
  const search = async (q: string) =>
    (
      await admin.get(`/students?q=${encodeURIComponent(q)}`).expect(200)
    ).body.map((s: { admissionNo: string }) => s.admissionNo);

  it('adds students, trimming input and refusing duplicates', async () => {
    const created = await admin
      .post('/students', {
        admissionNo: ' A-001 ',
        firstName: ' Chidi ',
        lastName: 'Eze',
      })
      .expect(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      admissionNo: 'A-001',
      firstName: 'Chidi',
      lastName: 'Eze',
      userId: null,
    });
    ids.chidi = created.body.id;
    ids.ada = (
      await admin
        .post('/students', {
          admissionNo: 'A-002',
          firstName: 'Ada',
          lastName: 'Okafor_100%',
          userId: ids.student,
        })
        .expect(201)
    ).body.id;

    await admin
      .post('/students', {
        admissionNo: 'A-001',
        firstName: 'X',
        lastName: 'Y',
      })
      .expect(409);
    await admin
      .post('/students', {
        admissionNo: 'A-003',
        firstName: 'X',
        lastName: 'Y',
        userId: ids.student,
      })
      .expect(409);
    await admin
      .post('/students', {
        admissionNo: 'A-003',
        firstName: 'X',
        lastName: 'Y',
        userId: ids.teacher,
      })
      .expect(422);
    await admin
      .post('/students', { admissionNo: ' ', firstName: 'X', lastName: 'Y' })
      .expect(400);
  });

  it('edits only the fields given', async () => {
    const res = await admin
      .patch(`/students/${ids.chidi}`, { firstName: 'Chidinma' })
      .expect(200);
    expect(res.body).toMatchObject({
      admissionNo: 'A-001',
      firstName: 'Chidinma',
      lastName: 'Eze',
    });
    await admin.patch(`/students/${ids.chidi}`, {}).expect(400);
    await admin
      .patch(`/students/${ids.chidi}`, { admissionNo: 'A-002' })
      .expect(409);
    await admin
      .patch(`/students/${randomUUID()}`, { firstName: 'X' })
      .expect(404);
  });

  it('searches names and admission numbers, literally', async () => {
    expect(await search('eze')).toEqual(['A-001']);
    expect(await search('a-00')).toEqual(['A-001', 'A-002']);
    expect(await search('CHIDINMA')).toEqual(['A-001']);
    expect(await search('_100%')).toEqual(['A-002']);
    expect(await search('%')).toEqual(['A-002']);
    expect(await search('nobody')).toEqual([]);
  });

  it('shows one student with their classes, newest session first', async () => {
    await admin.put(`/classes/${ids.olderClass}/students/${ids.chidi}`);
    await admin.put(`/classes/${ids.newerClass}/students/${ids.chidi}`);
    const res = await as('teacher').get(`/students/${ids.chidi}`).expect(200);
    expect(res.body).toEqual({
      id: ids.chidi,
      admissionNo: 'A-001',
      firstName: 'Chidinma',
      lastName: 'Eze',
      userId: null,
      enrolments: [
        {
          session: { id: ids.newer, name: '2026/2027' },
          class: { id: ids.newerClass, name: 'JSS 2A' },
        },
        {
          session: { id: ids.older, name: '2025/2026' },
          class: { id: ids.olderClass, name: 'JSS 1A' },
        },
      ],
    });
    await admin.get(`/students/${randomUUID()}`).expect(404);
    await admin.get('/students/not-a-uuid').expect(400);
  });

  it('lets teachers read but only admins write, and keeps students out', async () => {
    await as('teacher').get('/students').expect(200);
    await as('teacher')
      .post('/students', { admissionNo: 'T-1', firstName: 'X', lastName: 'Y' })
      .expect(403);
    await as('teacher')
      .patch(`/students/${ids.chidi}`, { firstName: 'X' })
      .expect(403);
    await as('student').get('/students').expect(403);
    await as('student').get(`/students/${ids.ada}`).expect(403);
  });
});
