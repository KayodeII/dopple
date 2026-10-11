import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/**
 * Its own file and app instance: the limiter's counters live in the app, so the
 * other suites are unaffected.
 */
describe('Sign-in rate limit (e2e)', () => {
  const slug = `rate-${randomUUID().slice(0, 8)}`;
  const host = `${slug}.${process.env.PLATFORM_DOMAIN}`;
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  const previous = process.env.LOGIN_RATE_LIMIT_PER_MINUTE;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.LOGIN_RATE_LIMIT_PER_MINUTE = '3';
    await owner.connect();
    await owner.query('insert into tenants (slug, name) values ($1, $1)', [
      slug,
    ]);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    process.env.LOGIN_RATE_LIMIT_PER_MINUTE = previous;
    await app?.close();
    await owner.query('delete from tenants where slug = $1', [slug]);
    await owner.end();
  });

  it('blocks password guessing after the per-minute limit', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('Host', host)
        .send({ email: 'nobody@example.test', password: 'guess' });

    for (let i = 0; i < 3; i++) await attempt().expect(401);
    await attempt().expect(429);
  });
});
