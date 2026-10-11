import { Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { subjects } from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';

const columns = { id: subjects.id, name: subjects.name, code: subjects.code };

@Injectable()
export class SubjectsService {
  constructor(private readonly tenantDb: TenantDb) {}

  list() {
    return this.tenantDb.run((tx) =>
      tx.select(columns).from(subjects).orderBy(asc(subjects.name)),
    );
  }

  /** A duplicate code is rejected by the database (409). */
  async create(input: { name: string; code: string }) {
    const [subject] = await this.tenantDb.run((tx, tenant) =>
      tx
        .insert(subjects)
        .values({ tenantId: tenant.id, name: input.name, code: input.code })
        .returning(columns),
    );
    return subject;
  }
}
