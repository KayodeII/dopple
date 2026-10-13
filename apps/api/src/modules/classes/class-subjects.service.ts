import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { classSubjects, subjects, users } from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { STAFF } from './classes.service.js';
import { assertActiveUser } from '../../common/assert-active-user.js';
import { findClassSession } from './lookups.js';

/** The subjects a class takes, and who teaches each one. */
@Injectable()
export class ClassSubjectsService {
  constructor(private readonly tenantDb: TenantDb) {}

  list(classId: string) {
    return this.tenantDb.run(async (tx) => {
      await findClassSession(tx, classId);
      const rows = await tx
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          teacherId: users.id,
          teacherName: users.name,
        })
        .from(classSubjects)
        .innerJoin(
          subjects,
          and(
            eq(subjects.tenantId, classSubjects.tenantId),
            eq(subjects.id, classSubjects.subjectId),
          ),
        )
        .leftJoin(
          users,
          and(
            eq(users.tenantId, classSubjects.tenantId),
            eq(users.id, classSubjects.teacherId),
          ),
        )
        .where(eq(classSubjects.classId, classId))
        .orderBy(asc(subjects.name));
      return rows.map(({ teacherId, teacherName, ...subject }) => ({
        ...subject,
        teacher: teacherId ? { id: teacherId, name: teacherName } : null,
      }));
    });
  }

  /** Adds the subject to the class, or changes its teacher if it is already there. */
  assign(classId: string, subjectId: string, teacherId: string | null) {
    return this.tenantDb.run(async (tx, tenant) => {
      await findClassSession(tx, classId);
      await assertActiveUser(tx, teacherId, STAFF, 'The subject teacher');
      await tx
        .insert(classSubjects)
        .values({ tenantId: tenant.id, classId, subjectId, teacherId })
        .onConflictDoUpdate({
          target: [
            classSubjects.tenantId,
            classSubjects.classId,
            classSubjects.subjectId,
          ],
          set: { teacherId },
        });
    });
  }

  async remove(classId: string, subjectId: string) {
    const removed = await this.tenantDb.run((tx) =>
      tx
        .delete(classSubjects)
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, subjectId),
          ),
        )
        .returning({ subjectId: classSubjects.subjectId }),
    );
    if (!removed.length)
      throw new NotFoundException('The class does not take this subject');
  }
}
