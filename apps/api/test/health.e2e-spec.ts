import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/**
 * Boots the whole app. Needs DATABASE_URL pointing at a migrated database
 * (pnpm infra:up && pnpm db:migrate). See AGENTS.md > Commands.
 */
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reports liveness without a school host', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('rejects requests for an unknown school', async () => {
    await request(app.getHttpServer())
      .get('/students')
      .set('Host', 'no-such-school.dopple.localhost')
      .expect(404);
  });
});
