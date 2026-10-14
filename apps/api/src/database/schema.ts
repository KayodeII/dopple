import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Database schema. Rules (see docs/decisions/0002-tenant-isolation.md):
 *  - Every tenant-owned table has `tenant_id` as the FIRST column of its primary key.
 *  - Every tenant-owned table has RLS enabled with the `tenantIsolation` policy below.
 *  - Query tenant-owned tables only through TenantDb.run(), which sets app.tenant_id.
 */

/** The role the API connects as. Created by infra/postgres/init.sql. */
export const appRole = pgRole('dopple_app').existing();

/** Rows are visible only when they belong to the tenant set for this transaction. */
const tenantIsolation = (table: string) =>
  pgPolicy(`${table}_tenant_isolation`, {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
    withCheck: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
  });

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** Tenant registry: one row per school. Not tenant-scoped; read-only for the app role. */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    customDomain: text('custom_domain').unique(),
    status: text('status', { enum: ['active', 'suspended'] })
      .notNull()
      .default('active'),
    /** Public logo for the marketing site's partner wall. */
    logoUrl: text('logo_url'),
    city: text('city'),
    /** The school has agreed to appear on the public partner wall. Off by default. */
    showcase: boolean('showcase').notNull().default(false),
    /** The school's colour for its web app, "#rrggbb". Null: Dopple's default. */
    brandColor: text('brand_color'),
    createdAt: createdAt(),
  },
  (t) => [
    check('tenants_brand_color', sql`${t.brandColor} ~ '^#[0-9a-f]{6}$'`),
  ],
);

export const students = pgTable(
  'students',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').notNull().defaultRandom(),
    admissionNo: text('admission_no').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /** The student's own sign-in account, if they have one. */
    userId: uuid('user_id'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('students_admission_no_per_tenant').on(t.tenantId, t.admissionNo),
    unique('students_user_per_tenant').on(t.tenantId, t.userId),
    foreignKey({
      columns: [t.tenantId, t.userId],
      foreignColumns: [users.tenantId, users.id],
    }),
    tenantIsolation('students'),
  ],
).enableRLS();

/** Everyone who can sign in to a school: staff, students and parents. */
export const users = pgTable(
  'users',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').notNull().defaultRandom(),
    /** Stored lower-cased so sign-in is case-insensitive. */
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role', {
      enum: ['admin', 'teacher', 'student', 'parent'],
    }).notNull(),
    /** scrypt hash (see auth/password.ts). Null for users who only sign in with Google or Microsoft. */
    passwordHash: text('password_hash'),
    status: text('status', { enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('users_email_per_tenant').on(t.tenantId, t.email),
    tenantIsolation('users'),
  ],
).enableRLS();

/**
 * Long-lived sign-in sessions. Only a SHA-256 of the token is stored, so a
 * database leak does not hand out sessions. Rotated on every refresh.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    tenantId: uuid('tenant_id').notNull(),
    id: uuid('id').notNull().defaultRandom(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('refresh_tokens_hash_per_tenant').on(t.tenantId, t.tokenHash),
    foreignKey({
      columns: [t.tenantId, t.userId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete('cascade'),
    tenantIsolation('refresh_tokens'),
  ],
).enableRLS();

/*
 * School structure. References between tenant-owned tables are composite
 * (tenant_id, id) foreign keys: Postgres checks foreign keys without row-level
 * security, so including tenant_id is what stops a row pointing at another school's row.
 */

/** A school year, e.g. "2026/2027". */
export const academicSessions = pgTable(
  'academic_sessions',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').notNull().defaultRandom(),
    name: text('name').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('academic_sessions_name_per_tenant').on(t.tenantId, t.name),
    check('academic_sessions_dates', sql`${t.endsOn} > ${t.startsOn}`),
    tenantIsolation('academic_sessions'),
  ],
).enableRLS();

export const terms = pgTable(
  'terms',
  {
    tenantId: uuid('tenant_id').notNull(),
    id: uuid('id').notNull().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    /** 1 for first term. Ordering within the session. */
    number: smallint('number').notNull(),
    name: text('name').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('terms_number_per_session').on(t.tenantId, t.sessionId, t.number),
    // Lets timetable slots reference (term, session) together, like classes_id_session.
    unique('terms_id_session').on(t.tenantId, t.id, t.sessionId),
    foreignKey({
      columns: [t.tenantId, t.sessionId],
      foreignColumns: [academicSessions.tenantId, academicSessions.id],
    }).onDelete('cascade'),
    check('terms_number_positive', sql`${t.number} > 0`),
    check('terms_dates', sql`${t.endsOn} > ${t.startsOn}`),
    tenantIsolation('terms'),
  ],
).enableRLS();

export const subjects = pgTable(
  'subjects',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    id: uuid('id').notNull().defaultRandom(),
    name: text('name').notNull(),
    /** Short code shown on timetables and report cards, e.g. "MTH". Stored upper-case. */
    code: text('code').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('subjects_code_per_tenant').on(t.tenantId, t.code),
    tenantIsolation('subjects'),
  ],
).enableRLS();

/** A class group within one session, e.g. "JSS 1A" in 2026/2027. */
export const classes = pgTable(
  'classes',
  {
    tenantId: uuid('tenant_id').notNull(),
    id: uuid('id').notNull().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    name: text('name').notNull(),
    /** The year group, e.g. "JSS 1". Classes at one level share a curriculum. */
    level: text('level').notNull(),
    formTeacherId: uuid('form_teacher_id'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('classes_name_per_session').on(t.tenantId, t.sessionId, t.name),
    // Lets enrolments reference (class, session) together, so the two cannot disagree.
    unique('classes_id_session').on(t.tenantId, t.id, t.sessionId),
    foreignKey({
      columns: [t.tenantId, t.sessionId],
      foreignColumns: [academicSessions.tenantId, academicSessions.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.formTeacherId],
      foreignColumns: [users.tenantId, users.id],
    }),
    tenantIsolation('classes'),
  ],
).enableRLS();

/** Which class a student is in for a session. One class per student per session. */
export const enrolments = pgTable(
  'enrolments',
  {
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id').notNull(),
    studentId: uuid('student_id').notNull(),
    classId: uuid('class_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.sessionId, t.studentId] }),
    foreignKey({
      columns: [t.tenantId, t.studentId],
      foreignColumns: [students.tenantId, students.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.classId, t.sessionId],
      foreignColumns: [classes.tenantId, classes.id, classes.sessionId],
    }).onDelete('cascade'),
    tenantIsolation('enrolments'),
  ],
).enableRLS();

/** The subjects a class takes, and who teaches each one. */
export const classSubjects = pgTable(
  'class_subjects',
  {
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    teacherId: uuid('teacher_id'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.classId, t.subjectId] }),
    foreignKey({
      columns: [t.tenantId, t.classId],
      foreignColumns: [classes.tenantId, classes.id],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.tenantId, t.subjectId],
      foreignColumns: [subjects.tenantId, subjects.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.teacherId],
      foreignColumns: [users.tenantId, users.id],
    }),
    tenantIsolation('class_subjects'),
  ],
).enableRLS();

/**
 * One lesson in a class's weekly timetable for a term. The term and class must be
 * in the same session, and the class must take the subject (both are foreign keys).
 * Migration 0006 also adds an exclusion constraint, which drizzle-kit cannot
 * express: a class's periods in a term may not overlap on the same day.
 */
export const timetableSlots = pgTable(
  'timetable_slots',
  {
    tenantId: uuid('tenant_id').notNull(),
    id: uuid('id').notNull().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    termId: uuid('term_id').notNull(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    /** ISO weekday: 1 is Monday, 7 is Sunday. */
    weekday: smallint('weekday').notNull(),
    /** School-local wall-clock time; the school's timezone applies. */
    startsAt: time('starts_at').notNull(),
    endsAt: time('ends_at').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    foreignKey({
      columns: [t.tenantId, t.termId, t.sessionId],
      foreignColumns: [terms.tenantId, terms.id, terms.sessionId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.tenantId, t.classId, t.sessionId],
      foreignColumns: [classes.tenantId, classes.id, classes.sessionId],
    }).onDelete('cascade'),
    // Removing a subject from a class removes its periods too.
    foreignKey({
      columns: [t.tenantId, t.classId, t.subjectId],
      foreignColumns: [
        classSubjects.tenantId,
        classSubjects.classId,
        classSubjects.subjectId,
      ],
    }).onDelete('cascade'),
    check('timetable_slots_weekday', sql`${t.weekday} between 1 and 7`),
    check('timetable_slots_times', sql`${t.endsAt} > ${t.startsAt}`),
    tenantIsolation('timetable_slots'),
  ],
).enableRLS();

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

/**
 * A school's uploaded logo (ADR 0010). Kept in Postgres while files are small;
 * served at GET /school/logo on the school's own address. Unlike other tenant
 * tables, every school's row is READABLE (logos are public), so reads must filter
 * by tenant_id themselves; writes are still limited to the school's own row.
 */
export const schoolLogos = pgTable(
  'school_logos',
  {
    tenantId: uuid('tenant_id')
      .primaryKey()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contentType: text('content_type', {
      enum: ['image/png', 'image/jpeg', 'image/webp'],
    }).notNull(),
    content: bytea('content').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('school_logos_size', sql`octet_length(${t.content}) <= 204800`),
    check(
      'school_logos_type',
      sql`${t.contentType} in ('image/png', 'image/jpeg', 'image/webp')`,
    ),
    tenantIsolation('school_logos'),
    // Logos are public (sign-in pages, the website's school search): anyone may read,
    // but the isolation policy above still limits writes to the school itself.
    pgPolicy('school_logos_public_read', {
      as: 'permissive',
      for: 'select',
      to: appRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export type TenantRow = typeof tenants.$inferSelect;
export type Student = typeof students.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = User['role'];
