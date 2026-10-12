import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { assertActiveUser } from '../../common/assert-active-user.js';
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

  /**
   * Links the student record to the account they sign in with, or unlinks it
   * (null). An account can belong to one student only (409 otherwise).
   */
  async linkUser(id: string, userId: string | null): Promise<Student> {
    const [updated] = await this.tenantDb.run(async (tx) => {
      await assertActiveUser(tx, userId, ['student'], 'The account');
      return tx
        .update(students)
        .set({ userId })
        .where(eq(students.id, id))
        .returning();
    });
    if (!updated) throw new NotFoundException('Student not found');
    return updated;
  }
}
