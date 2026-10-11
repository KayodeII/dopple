import { Inject } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

/** Inject the raw Drizzle client. For tenant-owned tables, use TenantDb instead. */
export const InjectDb = () => Inject(DB);
