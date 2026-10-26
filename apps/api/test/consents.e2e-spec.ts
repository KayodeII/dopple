import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/**
 * Parents' consent and their view of the record (ADR 0017): what the school keeps
 * about a child follows the parent's answer, and a parent can ask for corrections.
 */
describe('Consents and corrections (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const slug = `consents-${run}`;
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
    const hash = await hashPassword(password);
    ids.tenant = await insert(
      'insert into tenants (slug, name) values ($1, $1)',
      [slug],
    );
    for (const role of ['admin', 'teacher', 'parent']) {
      ids[role] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $3, $4)`,
        [ids.tenant, `${role}@example.test`, role, hash],
      );
    }
    for (const [key, no, first] of [
      ['ada', 'C-1', 'Ada'],
      ['chidi', 'C-2', 'Chidi'],
    ]) {
      ids[key] = await insert(
        `insert into students (tenant_id, admission_no, first_name, last_name, lga)
         values ($1, $2, $3, 'Okafor', 'Ikeja')`,
        [ids.tenant, no, first],
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    for (const role of ['admin', 'teacher', 'parent']) {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('Host', host)
        .send({ email: `${role}@example.test`, password })
        .expect(200);
      tokens[role] = res.body.accessToken;
    }
    const mother = await as('admin')
      .post(`/students/${ids.ada}/guardians`, {
        name: 'Ngozi Okafor',
        phone: '08031234567',
        userId: ids.parent,
        relationship: 'Mother',
      })
      .expect(201);
    ids.mother = mother.body.id;
    const father = await as('admin')
      .post(`/students/${ids.ada}/guardians`, {
        name: 'Emeka Okafor',
        phone: '08057654321',
        relationship: 'Father',
      })
      .expect(201);
    ids.father = father.body.id;
  });

  afterAll(async () => {
    await app?.close();
    for (const table of [
      'record_corrections',
      'consents',
      'student_health',
      'student_photos',
      'student_guardians',
      'guardians',
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

  const as = (who: 'admin' | 'teacher' | 'parent') => {
    const http = () => request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    return {
      get: (path: string) =>
        http().get(path).set('Host', host).auth(tokens[who], auth),
      post: (path: string, body: object = {}) =>
        http().post(path).set('Host', host).auth(tokens[who], auth).send(body),
      put: (path: string, body: object) =>
        http().put(path).set('Host', host).auth(tokens[who], auth).send(body),
    };
  };
  const consentsOf = async (studentId: string) =>
    (await as('admin').get(`/students/${studentId}`).expect(200)).body.consents;

  it('records a signed paper form against the guardian who signed it', async () => {
    const res = await as('admin')
      .put(`/students/${ids.ada}/consents/record`, {
        guardianId: ids.father,
        given: true,
      })
      .expect(200);
    expect(res.body).toEqual({
      record: {
        given: true,
        method: 'paper',
        wording: expect.stringContaining('admission record'),
        at: expect.any(String),
        guardian: { id: ids.father, name: 'Emeka Okafor' },
        relationship: 'Father',
      },
      health: null,
      photo: null,
    });
    expect((await consentsOf(ids.ada)).record.given).toBe(true);

    await as('teacher')
      .put(`/students/${ids.ada}/consents/record`, {
        guardianId: ids.father,
        given: true,
      })
      .expect(403);
    // The father is not Chidi's guardian.
    await as('admin')
      .put(`/students/${ids.chidi}/consents/record`, {
        guardianId: ids.father,
        given: true,
      })
      .expect(404);
    await as('admin')
      .put(`/students/${ids.ada}/consents/religion`, {
        guardianId: ids.father,
        given: true,
      })
      .expect(400);
  });

  it("shows a parent their own child's record, and only theirs", async () => {
    const res = await as('parent').get(`/children/${ids.ada}`).expect(200);
    expect(res.body).toMatchObject({
      id: ids.ada,
      admissionNo: 'C-1',
      lga: 'Ikeja',
      health: null,
      consents: { record: { given: true }, health: null, photo: null },
      consentWording: {
        record: expect.any(String),
        health: expect.any(String),
        photo: expect.any(String),
      },
    });
    expect(res.body).not.toHaveProperty('userId');
    // Their own contact details, and only the other parent's name.
    expect(res.body.guardians).toEqual([
      expect.objectContaining({
        name: 'Ngozi Okafor',
        phone: '+2348031234567',
        you: true,
      }),
      expect.objectContaining({
        name: 'Emeka Okafor',
        phone: null,
        email: null,
        you: false,
      }),
    ]);
    await as('parent').get(`/children/${ids.chidi}`).expect(404);
    await as('teacher').get(`/children/${ids.ada}`).expect(403);
  });

  it('keeps health details only while a parent agrees, and erases them on a no', async () => {
    const health = { genotype: 'AS', allergies: 'Groundnuts' };
    await as('admin').put(`/students/${ids.ada}/health`, health).expect(422);
    await as('parent')
      .put(`/children/${ids.ada}/consents/health`, { given: true })
      .expect(200);
    await as('parent')
      .put(`/children/${ids.chidi}/consents/health`, { given: true })
      .expect(404);
    await as('admin').put(`/students/${ids.ada}/health`, health).expect(200);
    expect((await consentsOf(ids.ada)).health).toMatchObject({
      given: true,
      method: 'online',
      guardian: { name: 'Ngozi Okafor' },
    });

    const withdrawn = await as('parent')
      .put(`/children/${ids.ada}/consents/health`, { given: false })
      .expect(200);
    expect(withdrawn.body.health.given).toBe(false);
    expect(
      (await as('admin').get(`/students/${ids.ada}`).expect(200)).body.health,
    ).toBeNull();
    await as('admin').put(`/students/${ids.ada}/health`, health).expect(422);

    // Every answer stays on record, and the app cannot rewrite them.
    const { rows } = await owner.query(
      `select given from consents where student_id = $1 and purpose = 'health' order by created_at`,
      [ids.ada],
    );
    expect(rows.map((r) => r.given)).toEqual([true, false]);
    const { rows: grants } = await owner.query(
      `select has_table_privilege('dopple_app', 'consents', 'UPDATE') as up,
              has_table_privilege('dopple_app', 'consents', 'DELETE') as del`,
    );
    expect(grants[0]).toEqual({ up: false, del: false });
  });

  it("stops counting a guardian's answer once they are unlinked", async () => {
    await as('admin')
      .put(`/students/${ids.ada}/consents/photo`, {
        guardianId: ids.father,
        given: true,
      })
      .expect(200);
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(100),
    ]);
    await request(app.getHttpServer())
      .put(`/students/${ids.ada}/photo`)
      .set('Host', host)
      .auth(tokens.admin, { type: 'bearer' })
      .set('Content-Type', 'image/jpeg')
      .send(jpeg)
      .expect(200);
    // Withdrawing the photo consent erases the photo.
    await as('parent')
      .put(`/children/${ids.ada}/consents/photo`, { given: false })
      .expect(200);
    await as('admin').get(`/students/${ids.ada}/photo`).expect(404);

    await request(app.getHttpServer())
      .delete(`/students/${ids.ada}/guardians/${ids.father}`)
      .set('Host', host)
      .auth(tokens.admin, { type: 'bearer' })
      .expect(204);
    const now = await consentsOf(ids.ada);
    expect(now.record).toBeNull();
    expect(now.photo).toMatchObject({ given: false, relationship: 'Mother' });
  });

  it('lets a parent ask for corrections, and an admin apply them', async () => {
    await as('parent')
      .post(`/children/${ids.ada}/corrections`, {
        changes: { lga: 'Ikorodu', allergies: 'Penicillin' },
      })
      .expect(422); // health consent was withdrawn above
    await as('parent')
      .post(`/children/${ids.ada}/corrections`, {
        changes: { admissionNo: 'X-1' },
      })
      .expect(400);
    await as('parent')
      .post(`/children/${ids.ada}/corrections`, { changes: {} })
      .expect(400);
    await as('parent')
      .post(`/children/${ids.chidi}/corrections`, {
        changes: { lga: 'Ikorodu' },
      })
      .expect(404);

    const asked = await as('parent')
      .post(`/children/${ids.ada}/corrections`, {
        changes: { lga: ' Ikorodu ', middleName: 'Chiamaka' },
        note: 'We moved last year',
      })
      .expect(201);
    expect(asked.body).toMatchObject({
      changes: { lga: 'Ikorodu', middleName: 'Chiamaka' },
      note: 'We moved last year',
      status: 'pending',
    });

    const pending = await as('admin').get('/corrections').expect(200);
    expect(pending.body).toEqual([
      expect.objectContaining({
        id: asked.body.id,
        student: { id: ids.ada, firstName: 'Ada', lastName: 'Okafor' },
        requestedBy: { id: ids.parent, name: 'parent' },
        changes: { lga: 'Ikorodu', middleName: 'Chiamaka' },
        current: { lga: 'Ikeja', middleName: null },
      }),
    ]);
    await as('admin')
      .get(`/corrections?studentId=${ids.chidi}`)
      .expect(200, []);
    await as('teacher').get('/corrections').expect(403);
    await as('parent').post(`/corrections/${asked.body.id}/apply`).expect(403);

    const applied = await as('admin')
      .post(`/corrections/${asked.body.id}/apply`)
      .expect(200);
    expect(applied.body).toMatchObject({
      status: 'applied',
      decidedAt: expect.any(String),
    });
    expect(
      (await as('admin').get(`/students/${ids.ada}`).expect(200)).body,
    ).toMatchObject({ lga: 'Ikorodu', middleName: 'Chiamaka' });
    await as('admin').post(`/corrections/${asked.body.id}/apply`).expect(409);
    await as('admin').get('/corrections').expect(200, []);
  });

  it('merges health corrections into the record, and explains a decline', async () => {
    await as('parent')
      .put(`/children/${ids.ada}/consents/health`, { given: true })
      .expect(200);
    await as('admin')
      .put(`/students/${ids.ada}/health`, { genotype: 'AS' })
      .expect(200);
    const health = await as('parent')
      .post(`/children/${ids.ada}/corrections`, {
        changes: { allergies: 'Penicillin' },
      })
      .expect(201);
    await as('admin').post(`/corrections/${health.body.id}/apply`).expect(200);
    expect(
      (await as('admin').get(`/students/${ids.ada}`).expect(200)).body.health,
    ).toEqual({
      bloodGroup: null,
      genotype: 'AS',
      allergies: 'Penicillin',
      conditions: null,
    });

    const wrong = await as('parent')
      .post(`/children/${ids.ada}/corrections`, {
        changes: { dateOfBirth: '2015-01-01' },
      })
      .expect(201);
    await as('admin')
      .post(`/corrections/${wrong.body.id}/decline`, { reply: '' })
      .expect(400);
    await as('admin')
      .post(`/corrections/${wrong.body.id}/decline`, {
        reply: 'Please bring the birth certificate to the office',
      })
      .expect(200);

    const mine = await as('parent')
      .get(`/children/${ids.ada}/corrections`)
      .expect(200);
    expect(
      mine.body.map((c: { status: string; reply: string | null }) => [
        c.status,
        c.reply,
      ]),
    ).toEqual([
      ['declined', 'Please bring the birth certificate to the office'],
      ['applied', null],
      ['applied', null],
    ]);
  });
});
