import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { enrolments, students } from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { findClassSession } from './lookups.js';

/** Enrolments: which class a student is in for a session. */
@Injectable()
export class ClassStudentsService {
  constructor(private readonly tenantDb: TenantDb) {}

  list(classId: string) {
    return this.tenantDb.run(async (tx) => {
      await findClassSession(tx, classId);
      return tx
        .select({
          id: students.id,
          admissionNo: students.admissionNo,
          firstName: students.firstName,
          lastName: students.lastName,
        })
        .from(enrolments)
        .innerJoin(
          students,
          and(
            eq(students.tenantId, enrolments.tenantId),
            eq(students.id, enrolments.studentId),
          ),
        )
        .where(eq(enrolments.classId, classId))
        .orderBy(asc(students.lastName), asc(students.firstName));
    });
  }

  /**
   * Puts the student in this class for the class's session. A student already in
   * another class that session is moved, since they can only be in one.
   */
  enrol(classId: string, studentId: string) {
    return this.tenantDb.run(async (tx, tenant) => {
      const sessionId = await findClassSession(tx, classId);
      await tx
        .insert(enrolments)
        .values({ tenantId: tenant.id, sessionId, studentId, classId })
        .onConflictDoUpdate({
          target: [
            enrolments.tenantId,
            enrolments.sessionId,
            enrolments.studentId,
          ],
          set: { classId },
        });
    });
  }

  async remove(classId: string, studentId: string) {
    const removed = await this.tenantDb.run((tx) =>
      tx
        .delete(enrolments)
        .where(
          and(
            eq(enrolments.classId, classId),
            eq(enrolments.studentId, studentId),
          ),
        )
        .returning({ studentId: enrolments.studentId }),
    );
    if (!removed.length)
      throw new NotFoundException('The student is not in this class');
  }
}
