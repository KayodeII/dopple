import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { FakeProvider } from '../src/modules/payments/providers/fake.provider.js';

/**
 * Fees end to end with the fake payment provider (ADR 0013): bill, connect the school's
 * account, pay, and webhooks that must not count twice or reach another school.
 */
describe('Fees (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const schools = { a: `fees-a-${run}`, b: `fees-b-${run}` };
  const hostOf = (slug: string) => `${slug}.${process.env.PLATFORM_DOMAIN}`;
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
    for (const [key, slug] of Object.entries(schools)) {
      ids[key] = await insert(
        'insert into tenants (slug, name) values ($1, $1)',
        [slug],
      );
      ids[`${key}Admin`] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, 'admin@example.test', 'Admin', 'admin', $2)`,
        [ids[key], hash],
      );
    }
    ids.studentUser = await insert(
      `insert into users (tenant_id, email, name, role, password_hash)
       values ($1, 'ada@example.test', 'Ada', 'student', $2)`,
      [ids.a, hash],
    );
    ids.ada = await insert(
      `insert into students (tenant_id, admission_no, first_name, last_name, user_id)
       values ($1, 'A-1', 'Ada', 'Okafor', $2)`,
      [ids.a, ids.studentUser],
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();

    for (const [key, slug, email] of [
      ['aAdmin', schools.a, 'admin@example.test'],
      ['bAdmin', schools.b, 'admin@example.test'],
      ['student', schools.a, 'ada@example.test'],
    ]) {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('Host', hostOf(slug))
        .send({ email, password })
        .expect(200);
      tokens[key] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
    for (const table of [
      'payment_events',
      'fee_payments',
      'fees',
      'payment_accounts',
      'students',
      'refresh_tokens',
      'users',
    ]) {
      await owner.query(
        `delete from ${table} where tenant_id = any($1::uuid[])`,
        [[ids.a, ids.b]],
      );
    }
    await owner.query('delete from tenants where id = any($1::uuid[])', [
      [ids.a, ids.b],
    ]);
    await owner.end();
  });

  const as = (who: 'aAdmin' | 'bAdmin' | 'student') => {
    const host = hostOf(who === 'bAdmin' ? schools.b : schools.a);
    const http = () => request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    return {
      get: (path: string) =>
        http().get(path).set('Host', host).auth(tokens[who], auth),
      post: (path: string, body: object = {}) =>
        http().post(path).set('Host', host).auth(tokens[who], auth).send(body),
      delete: (path: string) =>
        http().delete(path).set('Host', host).auth(tokens[who], auth),
    };
  };
  const webhook = (delivery: { headers: object; rawBody: Buffer }) =>
    request(app.getHttpServer())
      .post('/payments/webhooks/fake')
      .set(delivery.headers as Record<string, string>)
      .set('Content-Type', 'application/json')
      .send(delivery.rawBody.toString());

  it('bills a student, and only their school can see the fee', async () => {
    await as('aAdmin')
      .post('/fees', {
        description: 'First term tuition',
        amountMinor: 5_000_000,
        studentIds: [ids.ada],
      })
      .expect(201, { created: 1 });

    const [fee] = (await as('student').get('/fees/me').expect(200)).body;
    expect(fee).toMatchObject({
      description: 'First term tuition',
      amountMinor: 5_000_000,
      paidMinor: 0,
      status: 'unpaid',
    });
    ids.fee = fee.id;

    await as('bAdmin').get('/fees').expect(200, []);
    await as('bAdmin').delete(`/fees/${ids.fee}`).expect(404);
    await as('bAdmin')
      .post('/fees', {
        description: 'x',
        amountMinor: 100,
        studentIds: [ids.ada],
      })
      .expect(422);
    await as('student').get('/fees').expect(403);
  });

  it('cannot take payments until the school connects its account', async () => {
    await as('student').post(`/fees/${ids.fee}/pay`).expect(409);
    const res = await as('aAdmin').post('/fees/account').expect(201);
    expect(res.body).toMatchObject({
      provider: 'fake',
      connected: true,
      status: 'active',
    });
    // Connecting again keeps the same account.
    await as('aAdmin').post('/fees/account').expect(201);
    const { rows } = await owner.query(
      'select account_id from payment_accounts where tenant_id = $1',
      [ids.a],
    );
    expect(rows).toHaveLength(1);
    ids.account = rows[0].account_id;
  });

  it('pays through the provider page and marks the fee paid', async () => {
    const start = await as('student').post(`/fees/${ids.fee}/pay`).expect(201);
    const page = new URL(start.body.url);
    expect(page.pathname).toBe('/api/payments/fake/pay');

    const back = await request(app.getHttpServer())
      .get(`/payments/fake/pay${page.search}`)
      .expect(302);
    expect(back.headers.location).toContain(
      `/fees?paid=${start.body.paymentId}`,
    );

    const [fee] = (await as('student').get('/fees/me').expect(200)).body;
    expect(fee).toMatchObject({ paidMinor: 5_000_000, status: 'paid' });
    await as('student').post(`/fees/${ids.fee}/pay`).expect(409);
    await as('aAdmin').delete(`/fees/${ids.fee}`).expect(409);
  });

  it('counts a repeated webhook once, and ignores events from another account', async () => {
    await as('aAdmin')
      .post('/fees', {
        description: 'Bus',
        amountMinor: 200_000,
        studentIds: [ids.ada],
      })
      .expect(201);
    const bus = (await as('student').get('/fees/me').expect(200)).body.find(
      (f: { description: string }) => f.description === 'Bus',
    );
    const { body } = await as('student')
      .post(`/fees/${bus.id}/pay`)
      .expect(201);
    const fake = new FakeProvider();
    const event = {
      type: 'payment.succeeded' as const,
      eventId: `evt_${run}`,
      reference: body.paymentId,
      amountMinor: 200_000,
      currency: 'NGN',
      metadata: { tenantId: ids.a },
    };

    // Right school in the metadata, but not the school's own account: ignored.
    await webhook(
      fake.signedDelivery({ ...event, accountId: 'fake_acct_someone_else' }),
    ).expect(200);
    let fees = (await as('student').get('/fees/me').expect(200)).body;
    expect(fees.find((f: { id: string }) => f.id === bus.id).status).toBe(
      'unpaid',
    );

    await webhook(
      fake.signedDelivery({ ...event, accountId: ids.account }),
    ).expect(200);
    await webhook(
      fake.signedDelivery({ ...event, accountId: ids.account }),
    ).expect(200);
    fees = (await as('student').get('/fees/me').expect(200)).body;
    expect(fees.find((f: { id: string }) => f.id === bus.id)).toMatchObject({
      paidMinor: 200_000,
      status: 'paid',
    });
    const { rows } = await owner.query(
      'select count(*)::int as n from payment_events where tenant_id = $1 and event_id = $2',
      [ids.a, event.eventId],
    );
    expect(rows[0].n).toBe(1);
  });

  it('refuses unsigned webhooks and other providers', async () => {
    const delivery = new FakeProvider('wrong-secret').signedDelivery({
      type: 'payment.succeeded',
      eventId: 'evt_forged',
      accountId: ids.account,
      reference: null,
      amountMinor: 1,
      currency: 'NGN',
      metadata: { tenantId: ids.a },
    });
    await webhook(delivery).expect(400);
    await request(app.getHttpServer())
      .post('/payments/webhooks/bachs')
      .send({})
      .expect(404);
  });
});
