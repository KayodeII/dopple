import { and, eq, inArray, or } from 'drizzle-orm';
import {
  guardians,
  students,
  studentGuardians,
} from '../../database/schema.js';
import type { Transaction } from '../../database/tenant-db.service.js';

/**
 * The students a signed-in user acts for: a student's own record, or a parent's
 * children. Await it for the ids, or pass it to inArray() as a subquery.
 */
export function myStudentIds(tx: Transaction, userId: string) {
  return tx
    .select({ id: students.id })
    .from(students)
    .where(
      or(
        eq(students.userId, userId),
        inArray(
          students.id,
          tx
            .select({ id: studentGuardians.studentId })
            .from(studentGuardians)
            .innerJoin(
              guardians,
              and(
                eq(guardians.tenantId, studentGuardians.tenantId),
                eq(guardians.id, studentGuardians.guardianId),
              ),
            )
            .where(eq(guardians.userId, userId)),
        ),
      ),
    );
}
