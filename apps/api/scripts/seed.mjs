// Seeds two demo schools so tenant isolation can be seen locally:
//   curl -H "Host: greenfield.dopple.localhost" localhost:3000/students
//   curl -H "Host: riverside.dopple.localhost"  localhost:3000/students
// Each school gets demo staff accounts (password below) for trying sign-in:
//   curl -H "Host: greenfield.dopple.localhost" -H 'content-type: application/json' \
//     -d '{"email":"admin@greenfield.test","password":"dopple-demo"}' localhost:3000/auth/sign-in
// Runs as the database owner (MIGRATION_DATABASE_URL) because the app role cannot write tenants.
import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const DEMO_PASSWORD = 'dopple-demo';

// Same format as src/modules/auth/password.ts.
function hashPassword(password) {
  const [N, r, p] = [2 ** 15, 8, 1];
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize('NFKC'), salt, 64, { N, r, p, maxmem: 256 * N * r });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error('MIGRATION_DATABASE_URL is not set (see .env.example)');

const client = new pg.Client({ connectionString: url });
await client.connect();

const schools = [
  { slug: 'greenfield', name: 'Greenfield College', city: 'Lekki, Lagos', showcase: true, students: [['GF-001', 'Tolu', 'Adebayo'], ['GF-002', 'Amaka', 'Obi']] },
  { slug: 'riverside', name: 'Riverside Academy', city: 'Port Harcourt', showcase: true, students: [['RA-001', 'Musa', 'Bello']] },
];

try {
  await client.query('begin');
  for (const school of schools) {
    const { rows } = await client.query(
      `insert into tenants (slug, name, city, showcase) values ($1, $2, $3, $4)
       on conflict (slug) do update
         set name = excluded.name, city = excluded.city, showcase = excluded.showcase
       returning id`,
      [school.slug, school.name, school.city, school.showcase],
    );
    const tenantId = rows[0].id;
    for (const [admissionNo, firstName, lastName] of school.students) {
      await client.query(
        `insert into students (tenant_id, admission_no, first_name, last_name)
         values ($1, $2, $3, $4)
         on conflict on constraint students_admission_no_per_tenant do nothing`,
        [tenantId, admissionNo, firstName, lastName],
      );
    }
    for (const [role, name] of [['admin', 'Demo Admin'], ['teacher', 'Demo Teacher']]) {
      await client.query(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5)
         on conflict on constraint users_email_per_tenant do nothing`,
        [tenantId, `${role}@${school.slug}.test`, name, role, hashPassword(DEMO_PASSWORD)],
      );
    }
  }
  await client.query('commit');
  console.log(`Seeded ${schools.length} schools. Staff sign-in: admin@<slug>.test / teacher@<slug>.test, password "${DEMO_PASSWORD}".`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
