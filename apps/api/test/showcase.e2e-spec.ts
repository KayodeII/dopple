import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/** The partner wall lists only schools that opted in, on the platform host. */
describe('Showcase (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const optedIn = `show-in-${run}`;
  const optedOut = `show-out-${run}`;
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;

  beforeAll(async () => {
    await owner.connect();
    await owner.query(
      `insert into tenants (slug, name, city, showcase) values
       ($1, $1, 'Lagos', true), ($2, $2, 'Abuja', false)`,
      [optedIn, optedOut],
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await owner.query('delete from tenants where slug = any($1)', [
      [optedIn, optedOut],
    ]);
    await owner.end();
  });

  it('lists opted-in schools only, with public fields only', async () => {
    const res = await request(app.getHttpServer())
      .get('/showcase/schools')
      .set('Host', process.env.PLATFORM_DOMAIN ?? 'dopple.localhost')
      .expect(200);

    const body = res.body as {
      count: number;
      schools: Record<string, unknown>[];
    };
    const slugs = body.schools.map((s) => s.slug);
    expect(slugs).toContain(optedIn);
    expect(slugs).not.toContain(optedOut);
    expect(body.count).toBe(body.schools.length);
    expect(Object.keys(body.schools[0]).sort()).toEqual([
      'city',
      'logoUrl',
      'name',
      'slug',
    ]);
  });
});
