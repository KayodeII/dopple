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
    for (const role of ['admin', 'teacher', 'student', 'parent']) {
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
    for (const role of ['admin', 'teacher', 'student', 'parent']) {
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
      'student_photos',
      'student_health',
      'consents',
      'student_guardians',
      'guardians',
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
      put: (path: string, body?: object | Buffer, type?: string) => {
        const req = http().put(path).set('Host', host).auth(tokens[role], auth);
        if (type) req.set('Content-Type', type);
        return body === undefined ? req : req.send(body);
      },
      delete: (path: string) =>
        http().delete(path).set('Host', host).auth(tokens[role], auth),
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
      middleName: null,
      sex: null,
      dateOfBirth: null,
      admittedOn: null,
      nationality: null,
      stateOfOrigin: null,
      lga: null,
      homeAddress: null,
      previousSchool: null,
      religion: null,
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
      middleName: null,
      sex: null,
      dateOfBirth: null,
      admittedOn: null,
      nationality: null,
      stateOfOrigin: null,
      lga: null,
      homeAddress: null,
      previousSchool: null,
      religion: null,
      photoUpdatedAt: null,
      health: null,
      consents: { record: null, health: null, photo: null },
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

  it('keeps the whole admission record, all of it optional but checked', async () => {
    const res = await admin
      .patch(`/students/${ids.ada}`, {
        middleName: ' Chiamaka ',
        sex: 'female',
        dateOfBirth: '2014-03-09',
        admittedOn: '2026-09-07',
        nationality: 'Nigerian',
        stateOfOrigin: 'Anambra',
        lga: 'Onitsha North',
        homeAddress: '12 Admiralty Way, Lekki',
        previousSchool: 'Sunrise Primary School',
        religion: 'christianity',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      middleName: 'Chiamaka',
      stateOfOrigin: 'Anambra',
      dateOfBirth: '2014-03-09',
    });
    // Blank text means "not given".
    expect(
      (await admin.patch(`/students/${ids.ada}`, { lga: '  ' }).expect(200))
        .body.lga,
    ).toBeNull();

    for (const bad of [
      { stateOfOrigin: 'Lagos State' },
      { sex: 'unknown' },
      { religion: 'none' },
      { dateOfBirth: '2999-01-01' },
      { dateOfBirth: '09/03/2014' },
    ]) {
      await admin.patch(`/students/${ids.ada}`, bad).expect(400);
    }
    await admin
      .post('/students', {
        admissionNo: 'A-004',
        firstName: 'Bayo',
        lastName: 'Ade',
        sex: 'male',
        stateOfOrigin: 'Oyo',
      })
      .expect(201);
  });

  it('keeps health details apart, for staff to read and admins to change', async () => {
    const health = {
      bloodGroup: 'O+',
      genotype: 'AS',
      allergies: 'Groundnuts',
    };
    await admin.put(`/students/${ids.ada}/health`, health).expect(422);
    const father = await admin
      .post(`/students/${ids.ada}/guardians`, {
        name: 'Father',
        phone: '08031111111',
        relationship: 'Father',
      })
      .expect(201);
    ids.father = father.body.id;
    for (const purpose of ['health', 'photo']) {
      await admin
        .put(`/students/${ids.ada}/consents/${purpose}`, {
          guardianId: ids.father,
          given: true,
        })
        .expect(200);
    }
    await admin
      .put(`/students/${ids.ada}/health`, {
        bloodGroup: 'O+',
        genotype: 'AS',
        allergies: 'Groundnuts',
      })
      .expect(200, {
        bloodGroup: 'O+',
        genotype: 'AS',
        allergies: 'Groundnuts',
        conditions: null,
      });
    const read = await as('teacher').get(`/students/${ids.ada}`).expect(200);
    expect(read.body.health).toEqual({
      bloodGroup: 'O+',
      genotype: 'AS',
      allergies: 'Groundnuts',
      conditions: null,
    });
    await as('teacher')
      .put(`/students/${ids.ada}/health`, { genotype: 'AA' })
      .expect(403);
    await admin
      .put(`/students/${ids.ada}/health`, { genotype: 'XY' })
      .expect(400);
    // Clearing every field removes the record.
    await admin.put(`/students/${ids.ada}/health`, {}).expect(200);
    expect(
      (await admin.get(`/students/${ids.ada}`).expect(200)).body.health,
    ).toBeNull();
  });

  it('stores a passport photo that only staff, the student and their parents can see', async () => {
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(100),
    ]);
    await admin
      .put(`/students/${ids.ada}/photo`, Buffer.from('<svg/>'), 'image/svg+xml')
      .expect(422);
    await admin
      .put(`/students/${ids.ada}/photo`, Buffer.alloc(205_000), 'image/jpeg')
      .expect(413);
    await as('teacher')
      .put(`/students/${ids.ada}/photo`, jpeg, 'image/jpeg')
      .expect(403);
    const saved = await admin
      .put(`/students/${ids.ada}/photo`, jpeg, 'image/jpeg')
      .expect(200);
    expect(saved.body.photoUpdatedAt).toEqual(expect.any(String));

    for (const role of ['admin', 'teacher', 'student']) {
      const res = await as(role).get(`/students/${ids.ada}/photo`).expect(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.headers['cache-control']).toBe('private, no-store');
    }
    // Ada is the student account's own record; Chidi is not.
    await as('student').get(`/students/${ids.chidi}/photo`).expect(403);
    await as('parent').get(`/students/${ids.ada}/photo`).expect(403);
    const guardian = await insert(
      `insert into guardians (tenant_id, name, phone, user_id) values ($1, 'Parent', '+2348030000000', $2)`,
      [ids.tenant, ids.parent],
    );
    await owner.query(
      `insert into student_guardians (tenant_id, student_id, guardian_id, relationship) values ($1, $2, $3, 'Mother')`,
      [ids.tenant, ids.ada, guardian],
    );
    await as('parent').get(`/students/${ids.ada}/photo`).expect(200);

    await admin.delete(`/students/${ids.ada}/photo`).expect(204);
    await admin.get(`/students/${ids.ada}/photo`).expect(404);
  });
});
