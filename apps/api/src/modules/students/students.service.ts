import { Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { TenantDb } from '../../database/tenant-db.service.js';
import { students, type Student } from '../../database/schema.js';

/**
 * Reference feature module. Copy this shape for new modules:
 * controller (HTTP only) -> service (logic) -> TenantDb (data, tenant-scoped).
 */
@Injectable()
export class StudentsService {
  constructor(private readonly tenantDb: TenantDb) {}

  /** No tenant filter needed here: row-level security applies it. */
  list(): Promise<Student[]> {
    return this.tenantDb.run((tx) =>
      tx.select().from(students).orderBy(asc(students.lastName)),
    );
  }
}
