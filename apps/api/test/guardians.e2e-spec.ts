import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/**
 * Guardians end to end (ADR 0015): admins record a student's parents, siblings share
 * one, and a parent's account sees and pays only their own children's things.
 */
describe('Guardians (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const slug = `guardians-${run}`;
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
    for (const role of ['admin', 'teacher', 'student', 'parent']) {
      ids[role] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $3, $4)`,
        [ids.tenant, `${role}@example.test`, role, hash],
      );
    }
    for (const [key, no, first] of [
      ['ada', 'G-1', 'Ada'],
      ['bola', 'G-2', 'Bola'],
      ['chidi', 'G-3', 'Chidi'],
    ]) {
      ids[key] = await insert(
        `insert into students (tenant_id, admission_no, first_name, last_name)
         values ($1, $2, $3, 'Okafor')`,
        [ids.tenant, no, first],
      );
    }
    await owner.query(
      `insert into fees (tenant_id, student_id, description, amount_minor)
       values ($1, $2, 'Ada tuition', 500000), ($1, $3, 'Chidi tuition', 500000)`,
      [ids.tenant, ids.ada, ids.chidi],
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
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
      'payment_events',
      'fee_payments',
      'fees',
      'payment_accounts',
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

  const as = (who: 'admin' | 'teacher' | 'student' | 'parent') => {
    const http = () => request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    return {
      get: (path: string) =>
        http().get(path).set('Host', host).auth(tokens[who], auth),
      post: (path: string, body: object = {}) =>
        http().post(path).set('Host', host).auth(tokens[who], auth).send(body),
      patch: (path: string, body: object) =>
        http().patch(path).set('Host', host).auth(tokens[who], auth).send(body),
      delete: (path: string) =>
        http().delete(path).set('Host', host).auth(tokens[who], auth),
    };
  };

  it('records a guardian for a student, readable by staff only', async () => {
    const res = await as('admin')
      .post(`/students/${ids.ada}/guardians`, {
        name: 'Ngozi Okafor',
        phone: '0803 123 4567',
        relationship: 'Mother',
      })
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'Ngozi Okafor',
      phone: '+2348031234567',
      email: null,
      userId: null,
      relationship: 'Mother',
    });
    ids.ngozi = res.body.id;

    const read = await as('teacher')
      .get(`/students/${ids.ada}/guardians`)
      .expect(200);
    expect(read.body).toEqual([res.body]);
    await as('student').get(`/students/${ids.ada}/guardians`).expect(403);
    await as('teacher')
      .post(`/students/${ids.ada}/guardians`, {
        guardianId: ids.ngozi,
        relationship: 'Mother',
      })
      .expect(403);
    await as('admin')
      .post(`/students/${ids.ada}/guardians`, {
        name: 'X',
        phone: 'not a phone',
        relationship: 'Aunt',
      })
      .expect(400);
  });

  it('links the same guardian to a sibling, found by phone', async () => {
    const found = await as('admin').get('/guardians?q=0803123').expect(200);
    expect(found.body).toEqual([
      expect.objectContaining({
        id: ids.ngozi,
        children: [{ id: ids.ada, firstName: 'Ada', lastName: 'Okafor' }],
      }),
    ]);

    await as('admin')
      .post(`/students/${ids.bola}/guardians`, {
        guardianId: ids.ngozi,
        relationship: 'Mother',
      })
      .expect(201);
    await as('admin')
      .post(`/students/${ids.bola}/guardians`, {
        guardianId: ids.ngozi,
        relationship: 'Mother',
      })
      .expect(409);
    await as('admin')
      .post(`/students/${ids.bola}/guardians`, {
        guardianId: randomUUID(),
        relationship: 'Father',
      })
      .expect(422);
  });

  it('links a guardian to a parent account, and only a parent account', async () => {
    await as('admin')
      .patch(`/guardians/${ids.ngozi}`, { userId: ids.teacher })
      .expect(422);
    const res = await as('admin')
      .patch(`/guardians/${ids.ngozi}`, {
        userId: ids.parent,
        email: 'Parent@Example.test',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      userId: ids.parent,
      email: 'parent@example.test',
    });
    // One account is one guardian.
    await as('admin')
      .post(`/students/${ids.chidi}/guardians`, {
        name: 'Someone else',
        phone: '08099999999',
        userId: ids.parent,
        relationship: 'Uncle',
      })
      .expect(409);
  });

  it("shows a parent their own children, and nobody else's", async () => {
    const children = await as('parent').get('/children').expect(200);
    expect(
      children.body.map((c: { firstName: string }) => c.firstName),
    ).toEqual(['Ada', 'Bola']);
    expect(children.body[0]).toMatchObject({ admissionNo: 'G-1', class: null });
    await as('student').get('/children').expect(403);
    await as('admin').get('/children').expect(403);

    const termId = randomUUID();
    await as('parent').get(`/timetable/me?termId=${termId}`).expect(422);
    await as('parent')
      .get(`/timetable/me?termId=${termId}&studentId=${ids.ada}`)
      .expect(200, []);
    await as('parent')
      .get(`/timetable/me?termId=${termId}&studentId=${ids.chidi}`)
      .expect(404);
  });

  it("lets a parent see and pay their children's fees only", async () => {
    const fees = await as('parent').get('/fees/me').expect(200);
    expect(
      fees.body.map((f: { description: string }) => f.description),
    ).toEqual(['Ada tuition']);
    const chidiFee = (
      await owner.query<{ id: string }>(
        'select id from fees where tenant_id = $1 and student_id = $2',
        [ids.tenant, ids.chidi],
      )
    ).rows[0].id;
    await as('parent').post(`/fees/${chidiFee}/pay`).expect(403);

    await as('admin').post('/fees/account').expect(201);
    const pay = await as('parent')
      .post(`/fees/${fees.body[0].id}/pay`)
      .expect(201);
    const page = new URL(pay.body.url);
    await request(app.getHttpServer())
      .get(`/payments/fake/pay${page.search}`)
      .expect(302);
    const after = await as('parent').get('/fees/me').expect(200);
    expect(after.body[0]).toMatchObject({ status: 'paid' });
    const { rows } = await owner.query(
      'select payer_id from fee_payments where id = $1',
      [pay.body.paymentId],
    );
    expect(rows[0].payer_id).toBe(ids.parent);
  });

  it('removes a guardian once they have no children left', async () => {
    await as('admin')
      .delete(`/students/${ids.ada}/guardians/${ids.ngozi}`)
      .expect(204);
    await as('admin')
      .delete(`/students/${ids.ada}/guardians/${ids.ngozi}`)
      .expect(404);
    expect((await as('admin').get('/guardians').expect(200)).body).toHaveLength(
      1,
    );
    await as('admin')
      .delete(`/students/${ids.bola}/guardians/${ids.ngozi}`)
      .expect(204);
    await as('admin').get('/guardians').expect(200, []);
    await as('parent').get('/children').expect(200, []);
  });
});
