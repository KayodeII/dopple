import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/modules/auth/password.js';

/** Self-serve schools, the "find your school" search, and school branding (ADR 0010). */
describe('Schools (e2e)', () => {
  const run = randomUUID().slice(0, 8);
  const platform = process.env.PLATFORM_DOMAIN!;
  const newSlug = `new-${run}`;
  const existing = `found-${run}`;
  const suspended = `gone-${run}`;
  const password = 'a-long-test-password';
  const owner = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  let app: INestApplication;

  const http = () => request(app.getHttpServer());
  const onPlatform = (method: 'get' | 'post', path: string) =>
    http()[method](path).set('Host', platform);
  const hostOf = (slug: string) => `${slug}.${platform}`;

  beforeAll(async () => {
    await owner.connect();
    for (const [slug, name, status] of [
      [existing, `Found ${run} Academy`, 'active'],
      [suspended, `Found ${run} Old School`, 'suspended'],
    ]) {
      const { rows } = await owner.query<{ id: string }>(
        `insert into tenants (slug, name, city, status) values ($1, $2, 'Ibadan', $3) returning id`,
        [slug, name, status],
      );
      await owner.query(
        `insert into users (tenant_id, email, name, role, password_hash) values ($1, 'teacher@example.test', 'T', 'teacher', $2)`,
        [rows[0]!.id, await hashPassword(password)],
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    const slugs = [newSlug, existing, suspended];
    for (const table of ['refresh_tokens', 'users']) {
      await owner.query(
        `delete from ${table} where tenant_id in (select id from tenants where slug = any($1))`,
        [slugs],
      );
    }
    await owner.query('delete from tenants where slug = any($1)', [slugs]);
    await owner.end();
  });

  it('finds active schools by part of the name or address, never listing everyone', async () => {
    const res = await onPlatform('get', `/schools?q=found-${run}`).expect(200);
    expect(res.body).toEqual([
      {
        slug: existing,
        name: `Found ${run} Academy`,
        city: 'Ibadan',
        brandColor: null,
        url: expect.stringMatching(
          new RegExp(`^https?://${existing}\\.${platform}(:\\d+)?$`),
        ),
        signInUrl: expect.stringMatching(
          new RegExp(`${existing}\\.${platform}(:\\d+)?/sign-in$`),
        ),
        logoUrl: null,
      },
    ]);
    expect(
      (await onPlatform('get', `/schools?q=${run} ACAD`).expect(200)).body,
    ).toHaveLength(1);
    await onPlatform('get', '/schools?q=a').expect(400);
    await onPlatform('get', '/schools').expect(400);
  });

  it('says whether an address is free, and why not', async () => {
    const check = async (slug: string) =>
      (
        await onPlatform('get', `/schools/availability?slug=${slug}`).expect(
          200,
        )
      ).body;
    expect(await check(newSlug)).toEqual({
      slug: newSlug,
      available: true,
      reason: null,
    });
    expect(await check(existing.toUpperCase())).toMatchObject({
      slug: existing,
      available: false,
      reason: 'is already taken',
    });
    expect(await check('www')).toMatchObject({
      available: false,
      reason: 'is reserved',
    });
    expect((await check('-x')).available).toBe(false);
  });

  it('creates a school with its first admin, who can sign in at the new address straight away', async () => {
    // Visiting the address first caches "no such school"; creating it must clear that.
    await http().get('/school').set('Host', hostOf(newSlug)).expect(404);

    const created = await onPlatform('post', '/schools')
      .send({
        name: 'New Horizons School',
        slug: newSlug,
        city: 'Abuja',
        brandColor: '#2B5FD9',
        adminName: 'Ada Admin',
        adminEmail: 'Ada@Example.test',
        password,
      })
      .expect(201);
    expect(created.body).toEqual({
      slug: newSlug,
      name: 'New Horizons School',
      url: expect.stringContaining(hostOf(newSlug)),
      signInUrl: expect.stringMatching(
        /\/sign-in\?email=ada%40example\.test&welcome=1$/,
      ),
    });

    const school = await http()
      .get('/school')
      .set('Host', hostOf(newSlug))
      .expect(200);
    expect(school.body).toMatchObject({
      slug: newSlug,
      name: 'New Horizons School',
      brandColor: '#2b5fd9',
      logoUrl: null,
    });
    const signIn = await http()
      .post('/auth/sign-in')
      .set('Host', hostOf(newSlug))
      .send({ email: 'ada@example.test', password })
      .expect(200);
    expect(signIn.body.user).toMatchObject({
      name: 'Ada Admin',
      role: 'admin',
    });
  });

  it('refuses taken, reserved or badly formed sign-ups', async () => {
    const body = {
      name: 'Copy',
      slug: newSlug,
      adminName: 'X',
      adminEmail: 'x@example.test',
      password,
    };
    const taken = await onPlatform('post', '/schools').send(body).expect(409);
    expect(taken.body.message).toBe('That address is already taken');
    await onPlatform('post', '/schools')
      .send({ ...body, slug: 'admin' })
      .expect(400);
    await onPlatform('post', '/schools')
      .send({ ...body, slug: `ok-${run}`, password: 'short' })
      .expect(400);
    await onPlatform('post', '/schools')
      .send({ ...body, slug: `ok-${run}`, brandColor: 'blue' })
      .expect(400);
  });

  describe('branding', () => {
    const host = () => hostOf(newSlug);
    let admin: string;
    let teacher: string;
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    beforeAll(async () => {
      admin = (
        await http()
          .post('/auth/sign-in')
          .set('Host', host())
          .send({ email: 'ada@example.test', password })
      ).body.accessToken;
      teacher = (
        await http()
          .post('/auth/sign-in')
          .set('Host', hostOf(existing))
          .send({ email: 'teacher@example.test', password })
      ).body.accessToken;
    });

    it('lets the admin rename the school and change or reset its colours', async () => {
      const res = await http()
        .patch('/school')
        .set('Host', host())
        .auth(admin, { type: 'bearer' })
        .send({
          name: 'New Horizons College',
          brandColor: '#B4432F',
          accentColor: '#F2B632',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'New Horizons College',
        brandColor: '#b4432f',
        accentColor: '#f2b632',
      });
      // Changing one colour leaves the other alone.
      const reset = await http()
        .patch('/school')
        .set('Host', host())
        .auth(admin, { type: 'bearer' })
        .send({ brandColor: null })
        .expect(200);
      expect(reset.body).toMatchObject({
        name: 'New Horizons College',
        brandColor: null,
        accentColor: '#f2b632',
      });
      await http()
        .patch('/school')
        .set('Host', host())
        .auth(admin, { type: 'bearer' })
        .send({ accentColor: 'gold' })
        .expect(400);

      await http()
        .patch('/school')
        .set('Host', host())
        .auth(admin, { type: 'bearer' })
        .send({})
        .expect(400);
      await http()
        .patch('/school')
        .set('Host', host())
        .send({ name: 'Nope' })
        .expect(401);
      await http()
        .patch('/school')
        .set('Host', hostOf(existing))
        .auth(teacher, { type: 'bearer' })
        .send({ name: 'Nope' })
        .expect(403);
    });

    it('stores a logo, serves it safely, and replaces or removes it', async () => {
      const put = (body: Buffer, type = 'image/png') =>
        http()
          .put('/school/logo')
          .set('Host', host())
          .set('Content-Type', type)
          .auth(admin, { type: 'bearer' })
          .send(body);

      const saved = await put(png).expect(200);
      expect(saved.body.logoUrl).toMatch(/^\/api\/school\/logo\?v=\d+$/);

      const logo = await http()
        .get('/school/logo')
        .set('Host', host())
        .buffer(true)
        .expect(200);
      expect(logo.headers['content-type']).toBe('image/png');
      expect(logo.headers['x-content-type-options']).toBe('nosniff');
      expect(logo.headers['content-security-policy']).toContain('sandbox');
      expect(Buffer.compare(logo.body as Buffer, png)).toBe(0);

      // The search on the website shows it too.
      const [found] = (
        await onPlatform('get', `/schools?q=${newSlug}`).expect(200)
      ).body;
      expect(found.logoUrl).toMatch(
        new RegExp(`${host()}(:\\d+)?/api/school/logo\\?v=\\d+$`),
      );

      // Whatever the Content-Type says, only real PNG/JPEG/WebP bytes are accepted.
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      await put(svg, 'image/png').expect(422);
      await put(Buffer.concat([png, Buffer.alloc(200 * 1024)])).expect(413);

      await http()
        .delete('/school/logo')
        .set('Host', host())
        .auth(admin, { type: 'bearer' })
        .expect(204);
      await http().get('/school/logo').set('Host', host()).expect(404);
    });
  });
});
