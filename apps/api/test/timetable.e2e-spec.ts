import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Class timetables: periods per class and term, with clash checks. */
describe('Timetable (e2e)', () => {
  const slug = `timetable-${randomUUID().slice(0, 8)}`;
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
      ?.id;

  beforeAll(async () => {
    await owner.connect();
    const tenant = await insert(
      'insert into tenants (slug, name) values ($1, $1)',
      [slug],
    );
    const hash = await hashPassword(password);
    for (const [key, role] of [
      ['admin', 'admin'],
      ['teacher', 'teacher'],
      ['teacher2', 'teacher'],
      ['student', 'student'],
      ['parent', 'parent'],
    ]) {
      ids[key] = await insert(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5)`,
        [tenant, `${key}@example.test`, `Test ${key}`, role, hash],
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
    for (const [key, sessionId, number, starts, ends] of [
      ['term1', session, 1, '2026-09-07', '2026-12-11'],
      ['term2', session, 2, '2027-01-11', '2027-04-02'],
      ['nextTerm', nextSession, 1, '2027-09-06', '2027-12-10'],
    ]) {
      ids[key] = await insert(
        `insert into terms (tenant_id, session_id, number, name, starts_on, ends_on)
         values ($1, $2, $3, 'Term', $4, $5)`,
        [tenant, sessionId, number, starts, ends],
      );
    }
    for (const [key, name] of [
      ['jss1a', 'JSS 1A'],
      ['jss1b', 'JSS 1B'],
    ]) {
      ids[key] = await insert(
        `insert into classes (tenant_id, session_id, name, level) values ($1, $2, $3, 'JSS 1')`,
        [tenant, session, name],
      );
    }
    for (const [key, code] of [
      ['maths', 'MTH'],
      ['english', 'ENG'],
      ['science', 'BSC'],
    ]) {
      ids[key] = await insert(
        `insert into subjects (tenant_id, name, code) values ($1, $2, $2)`,
        [tenant, code],
      );
    }
    for (const [classId, subjectId, teacherId] of [
      [ids.jss1a, ids.maths, ids.teacher],
      [ids.jss1a, ids.english, ids.teacher2],
      [ids.jss1b, ids.maths, ids.teacher],
      [ids.jss1b, ids.english, null],
    ]) {
      await owner.query(
        `insert into class_subjects (tenant_id, class_id, subject_id, teacher_id)
         values ($1, $2, $3, $4)`,
        [tenant, classId, subjectId, teacherId],
      );
    }
    const student = await insert(
      `insert into students (tenant_id, admission_no, first_name, last_name, user_id)
       values ($1, 'A-1', 'Ada', 'Okafor', $2)`,
      [tenant, ids.student],
    );
    await owner.query(
      `insert into enrolments (tenant_id, session_id, student_id, class_id)
       values ($1, $2, $3, $4)`,
      [tenant, session, student, ids.jss1a],
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    for (const key of ['admin', 'teacher', 'teacher2', 'student', 'parent']) {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .set('Host', host)
        .send({ email: `${key}@example.test`, password })
        .expect(200);
      tokens[key] = res.body.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
    for (const table of [
      'timetable_slots',
      'enrolments',
      'class_subjects',
      'classes',
      'terms',
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

  const as = (who: string) => {
    const http = () => request(app.getHttpServer());
    const auth = { type: 'bearer' } as const;
    return {
      get: (path: string) =>
        http().get(path).set('Host', host).auth(tokens[who], auth),
      post: (path: string, body: object) =>
        http().post(path).set('Host', host).auth(tokens[who], auth).send(body),
      delete: (path: string) =>
        http().delete(path).set('Host', host).auth(tokens[who], auth),
    };
  };
  const admin = as('admin');
  const add = (
    classKey: string,
    subjectKey: string,
    weekday: number,
    startsAt: string,
    endsAt: string,
    termKey = 'term1',
  ) =>
    admin.post(`/classes/${ids[classKey]}/timetable`, {
      termId: ids[termKey],
      subjectId: ids[subjectKey],
      weekday,
      startsAt,
      endsAt,
    });
  type Lesson = {
    weekday: number;
    startsAt: string;
    class: { name: string };
    subject: { code: string };
  };
  const summary = (lessons: Lesson[]) =>
    lessons.map(
      (l) => `${l.weekday} ${l.startsAt} ${l.class.name} ${l.subject.code}`,
    );
  const timetable = async (classKey: string, termKey = 'term1') =>
    summary(
      (
        await admin
          .get(`/classes/${ids[classKey]}/timetable?termId=${ids[termKey]}`)
          .expect(200)
      ).body,
    );

  it('adds periods and returns them with subject and teacher', async () => {
    const created = await add('jss1a', 'maths', 1, '08:00', '08:40').expect(
      201,
    );
    expect(created.body).toEqual({
      id: expect.any(String),
      weekday: 1,
      startsAt: '08:00',
      endsAt: '08:40',
      class: { id: ids.jss1a, name: 'JSS 1A' },
      subject: { id: ids.maths, code: 'MTH', name: 'MTH' },
      teacher: { id: ids.teacher, name: 'Test teacher' },
    });
    // Back to back is fine; periods are half-open.
    await add('jss1a', 'english', 1, '08:40', '09:20').expect(201);
    await add('jss1a', 'english', 2, '08:00', '08:40').expect(201);
    await add('jss1b', 'english', 1, '08:00', '08:40').expect(201);

    expect(await timetable('jss1a')).toEqual([
      '1 08:00 JSS 1A MTH',
      '1 08:40 JSS 1A ENG',
      '2 08:00 JSS 1A ENG',
    ]);
    expect(await timetable('jss1a', 'term2')).toEqual([]);
  });

  it('refuses overlapping periods in a class', async () => {
    const res = await add('jss1a', 'maths', 1, '08:20', '09:00').expect(409);
    expect(res.body.message).toBe('This overlaps an existing record');
    // The same time in another term is a different timetable.
    await add('jss1a', 'maths', 1, '08:20', '09:00', 'term2').expect(201);
  });

  it('refuses to double-book a teacher across classes', async () => {
    const res = await add('jss1b', 'maths', 1, '08:20', '09:00').expect(409);
    expect(res.body.message).toBe(
      'Test teacher already teaches JSS 1A MTH from 08:00 to 08:40',
    );
    await add('jss1b', 'maths', 1, '09:20', '10:00').expect(201);
    // An unassigned subject has no teacher to clash.
    await add('jss1b', 'english', 2, '08:00', '08:40').expect(201);
  });

  it('rejects subjects the class does not take, and terms from another year', async () => {
    const res = await add('jss1a', 'science', 3, '08:00', '08:40').expect(422);
    expect(res.body.message).toBe('The class does not take this subject');
    await add('jss1a', 'maths', 3, '08:00', '08:40', 'nextTerm').expect(422);
    await add('jss1a', 'maths', 3, '09:00', '08:00').expect(400);
    await admin
      .post(`/classes/${randomUUID()}/timetable`, {
        termId: ids.term1,
        subjectId: ids.maths,
        weekday: 3,
        startsAt: '08:00',
        endsAt: '08:40',
      })
      .expect(404);
    await admin.get(`/classes/${ids.jss1a}/timetable`).expect(400);
  });

  it('shows teachers their lessons and students their class', async () => {
    const mine = async (who: string) =>
      summary(
        (await as(who).get(`/timetable/me?termId=${ids.term1}`).expect(200))
          .body,
      );
    expect(await mine('teacher')).toEqual([
      '1 08:00 JSS 1A MTH',
      '1 09:20 JSS 1B MTH',
    ]);
    expect(await mine('teacher2')).toEqual([
      '1 08:40 JSS 1A ENG',
      '2 08:00 JSS 1A ENG',
    ]);
    expect(await mine('student')).toEqual(await timetable('jss1a'));
    await as('parent').get(`/timetable/me?termId=${ids.term1}`).expect(403);
  });

  it('lets only admins change the timetable', async () => {
    const [lesson] = (
      await as('student')
        .get(`/classes/${ids.jss1a}/timetable?termId=${ids.term1}`)
        .expect(200)
    ).body;
    await as('teacher')
      .post(`/classes/${ids.jss1a}/timetable`, {
        termId: ids.term1,
        subjectId: ids.maths,
        weekday: 4,
        startsAt: '08:00',
        endsAt: '08:40',
      })
      .expect(403);
    await as('teacher')
      .delete(`/classes/${ids.jss1a}/timetable/${lesson.id}`)
      .expect(403);

    await admin
      .delete(`/classes/${ids.jss1b}/timetable/${lesson.id}`)
      .expect(404);
    await admin
      .delete(`/classes/${ids.jss1a}/timetable/${lesson.id}`)
      .expect(204);
    await admin
      .delete(`/classes/${ids.jss1a}/timetable/${lesson.id}`)
      .expect(404);
    expect(await timetable('jss1a')).toEqual([
      '1 08:40 JSS 1A ENG',
      '2 08:00 JSS 1A ENG',
    ]);
  });

  it('drops a subject’s periods when the class stops taking it', async () => {
    await admin
      .delete(`/classes/${ids.jss1a}/subjects/${ids.english}`)
      .expect(204);
    expect(await timetable('jss1a')).toEqual([]);
  });
});
