import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/**
 * Dopple Learn (ADR 0011): free lessons for anyone, no sign-in and no school needed.
 * Uses the real catalogue, so run `pnpm learn:load` first (CI does).
 */
describe('Learn (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

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

  it('lists every class from Nursery 1 to SS 3, without signing in', async () => {
    const res = await http().get('/learn').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    const classes = res.body.stages.flatMap(
      (s: { classes: { slug: string }[] }) => s.classes,
    );
    expect(classes).toHaveLength(14);
    expect(classes[0]).toMatchObject({ slug: 'nursery-1', name: 'Nursery 1' });
    expect(
      classes.find((c: { slug: string }) => c.slug === 'primary-4').topicCount,
    ).toBeGreaterThan(0);
  });

  it('lists a class’s subjects, the ones with lessons first', async () => {
    const res = await http().get('/learn/classes/primary-4').expect(200);
    expect(res.body.class).toEqual({
      slug: 'primary-4',
      name: 'Primary 4',
      stage: 'primary',
    });
    const subjects: { slug: string; topics: unknown[] }[] = res.body.subjects;
    const hasLessons = subjects.map((s) => s.topics.length > 0);
    // Once a subject without lessons appears, no later one has any.
    expect(hasLessons.slice(hasLessons.indexOf(false))).not.toContain(true);
    const maths = subjects.find((s) => s.slug === 'mathematics');
    expect(maths?.topics[0]).toMatchObject({
      slug: 'primary-4-equivalent-fractions',
      questionCount: 5,
    });
    const names = res.body.subjects.map((s: { name: string }) => s.name);
    // Subjects from the 2025 curriculum for this class only.
    expect(names).toContain('Basic Science and Technology');
    expect(names).not.toContain('General Mathematics');
  });

  it('serves a lesson with its practice questions and answers', async () => {
    const res = await http().get('/learn/topics/jss-1-hcf-and-lcm').expect(200);
    expect(res.body).toMatchObject({
      title: 'Factors, multiples, HCF and LCM',
      class: { slug: 'jss-1', name: 'JSS 1' },
      subject: { slug: 'mathematics', name: 'Mathematics' },
    });
    expect(res.body.lesson[0]).toHaveProperty('type');
    expect(res.body.questions[1]).toMatchObject({
      prompt: 'Find the HCF of 12 and 18.',
      options: ['2', '3', '6', '36'],
      answer: 2,
    });
    expect(res.body).not.toHaveProperty('id');
  });

  it('answers 404 for a class or lesson that does not exist', async () => {
    await http().get('/learn/classes/form-7').expect(404);
    await http().get('/learn/topics/nope').expect(404);
  });

  it('works on a school’s own address too', async () => {
    await http()
      .get('/learn')
      .set('Host', 'greenfield.dopple.localhost')
      .expect(200);
  });

  it('lets the app role read Learn content but never change it', async () => {
    const appRole = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });
    await appRole.connect();
    try {
      const { rows } = await appRole.query(
        'select count(*)::int as n from learn_topics',
      );
      expect(rows[0].n).toBeGreaterThan(0);
      await expect(
        appRole.query(`update learn_topics set title = 'x'`),
      ).rejects.toThrow(/permission denied/);
      await expect(
        appRole.query('delete from learn_questions'),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await appRole.end();
    }
  });
});
