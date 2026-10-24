// Seeds two demo schools so tenant isolation can be seen locally:
//   curl -H "Host: greenfield.dopple.localhost" localhost:3000/students
//   curl -H "Host: riverside.dopple.localhost"  localhost:3000/students
// Each school gets demo admin, teacher and student accounts (password below) for trying sign-in:
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
  { slug: 'greenfield', name: 'Greenfield College', city: 'Lekki, Lagos', showcase: true, brandColor: null, accentColor: null, students: [['GF-001', 'Tolu', 'Adebayo'], ['GF-002', 'Amaka', 'Obi']] },
  { slug: 'riverside', name: 'Riverside Academy', city: 'Port Harcourt', showcase: true, brandColor: '#2b5fd9', accentColor: '#f2b632', students: [['RA-001', 'Musa', 'Bello']] },
];

// A school year with three terms, a few subjects and two JSS 1 classes. Every demo
// student is in JSS 1A, which takes all subjects with the demo teacher and has a
// first-term timetable; the first student is linked to the demo student account.
async function seedStructure(tenantId, slug) {
  const session = await client.query(
    `insert into academic_sessions (tenant_id, name, starts_on, ends_on)
     values ($1, '2026/2027', '2026-09-07', '2027-07-23')
     on conflict on constraint academic_sessions_name_per_tenant do update set name = excluded.name
     returning id`,
    [tenantId],
  );
  const sessionId = session.rows[0].id;
  const terms = [
    [1, 'First term', '2026-09-07', '2026-12-11'],
    [2, 'Second term', '2027-01-11', '2027-04-02'],
    [3, 'Third term', '2027-04-26', '2027-07-23'],
  ];
  for (const [number, name, startsOn, endsOn] of terms) {
    await client.query(
      `insert into terms (tenant_id, session_id, number, name, starts_on, ends_on)
       values ($1, $2, $3, $4, $5, $6)
       on conflict on constraint terms_number_per_session do nothing`,
      [tenantId, sessionId, number, name, startsOn, endsOn],
    );
  }
  for (const [code, name] of [['MTH', 'Mathematics'], ['ENG', 'English Language'], ['BSC', 'Basic Science']]) {
    await client.query(
      `insert into subjects (tenant_id, code, name) values ($1, $2, $3)
       on conflict on constraint subjects_code_per_tenant do nothing`,
      [tenantId, code, name],
    );
  }
  const teacher = await client.query(
    'select id from users where tenant_id = $1 and email = $2',
    [tenantId, `teacher@${slug}.test`],
  );
  for (const name of ['JSS 1A', 'JSS 1B']) {
    await client.query(
      `insert into classes (tenant_id, session_id, name, level, form_teacher_id)
       values ($1, $2, $3, 'JSS 1', $4)
       on conflict on constraint classes_name_per_session do nothing`,
      [tenantId, sessionId, name, name === 'JSS 1A' ? teacher.rows[0].id : null],
    );
  }
  const jss1a = await client.query(
    `select id from classes where tenant_id = $1 and session_id = $2 and name = 'JSS 1A'`,
    [tenantId, sessionId],
  );
  const classId = jss1a.rows[0].id;
  await client.query(
    `insert into enrolments (tenant_id, session_id, student_id, class_id)
     select tenant_id, $2, id, $3 from students where tenant_id = $1
     on conflict do nothing`,
    [tenantId, sessionId, classId],
  );
  await client.query(
    `insert into class_subjects (tenant_id, class_id, subject_id, teacher_id)
     select tenant_id, $2, id, $3 from subjects where tenant_id = $1
     on conflict do nothing`,
    [tenantId, classId, teacher.rows[0].id],
  );
  // Three morning periods, Monday to Friday, rotating through the subjects.
  // ON CONFLICT DO NOTHING also covers the no-overlap exclusion constraint, so re-runs are safe.
  const periods = [['08:00', '08:40'], ['08:40', '09:20'], ['09:20', '10:00']];
  const codes = ['MTH', 'ENG', 'BSC'];
  for (let weekday = 1; weekday <= 5; weekday++) {
    for (const [i, [startsAt, endsAt]] of periods.entries()) {
      await client.query(
        `insert into timetable_slots (tenant_id, session_id, term_id, class_id, subject_id, weekday, starts_at, ends_at)
         select $1, $2, t.id, $3, s.id, $4, $5, $6
         from terms t, subjects s
         where t.tenant_id = $1 and t.session_id = $2 and t.number = 1 and s.tenant_id = $1 and s.code = $7
         on conflict do nothing`,
        [tenantId, sessionId, classId, weekday, startsAt, endsAt, codes[(weekday + i) % codes.length]],
      );
    }
  }
  await client.query(
    `update students set user_id = (select id from users where tenant_id = $1 and email = $2)
     where tenant_id = $1 and user_id is null
       and admission_no = (select min(admission_no) from students where tenant_id = $1)
       and not exists (select 1 from students where tenant_id = $1 and user_id is not null)`,
    [tenantId, `student@${slug}.test`],
  );
}

try {
  await client.query('begin');
  for (const school of schools) {
    const { rows } = await client.query(
      `insert into tenants (slug, name, city, showcase, brand_color, accent_color) values ($1, $2, $3, $4, $5, $6)
       on conflict (slug) do update
         set name = excluded.name, city = excluded.city, showcase = excluded.showcase,
             brand_color = excluded.brand_color, accent_color = excluded.accent_color
       returning id`,
      [school.slug, school.name, school.city, school.showcase, school.brandColor, school.accentColor],
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
    for (const [role, name] of [['admin', 'Demo Admin'], ['teacher', 'Demo Teacher'], ['student', 'Demo Student']]) {
      await client.query(
        `insert into users (tenant_id, email, name, role, password_hash)
         values ($1, $2, $3, $4, $5)
         on conflict on constraint users_email_per_tenant do nothing`,
        [tenantId, `${role}@${school.slug}.test`, name, role, hashPassword(DEMO_PASSWORD)],
      );
    }
    await seedStructure(tenantId, school.slug);
    // First-term tuition for every student, once. No payment account: the admin sets that up.
    await client.query(
      `insert into fees (tenant_id, student_id, description, amount_minor, due_on)
       select tenant_id, id, 'First term tuition', 8500000, '2026-09-30' from students
       where tenant_id = $1 and not exists (select 1 from fees where tenant_id = $1)`,
      [tenantId],
    );
  }
  await client.query('commit');
  console.log(`Seeded ${schools.length} schools. Sign-in: admin@, teacher@ or student@<slug>.test, password "${DEMO_PASSWORD}".`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
