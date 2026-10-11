import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { TENANT_KEY, type Tenant } from '../tenancy/tenant.js';
import { DB, type Database } from './tokens.js';

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * The only way to touch tenant-owned tables.
 *
 * Opens a transaction and sets `app.tenant_id` for its duration, so Postgres
 * row-level security filters every query to the current school. A query that
 * forgets a WHERE clause returns that school's rows only, never another's.
 */
@Injectable()
export class TenantDb {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly cls: ClsService,
  ) {}

  run<T>(work: (tx: Transaction, tenant: Tenant) => Promise<T>): Promise<T> {
    const tenant = this.cls.get<Tenant | undefined>(TENANT_KEY);
    if (!tenant) {
      throw new Error(
        'TenantDb.run() called outside a tenant request. Is the route excluded from TenantMiddleware?',
      );
    }
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.tenant_id', ${tenant.id}, true)`,
      );
      return work(tx, tenant);
    });
  }
}
