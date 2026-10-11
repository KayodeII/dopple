import { sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  text,
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
export const tenants = pgTable('tenants', {
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
  createdAt: createdAt(),
});

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
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique('students_admission_no_per_tenant').on(t.tenantId, t.admissionNo),
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

export type TenantRow = typeof tenants.$inferSelect;
export type Student = typeof students.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = User['role'];
