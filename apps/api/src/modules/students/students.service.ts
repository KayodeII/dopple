import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { assertActiveUser } from '../../common/assert-active-user.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import {
  academicSessions,
  classes,
  enrolments,
  students,
} from '../../database/schema.js';

export interface StudentInput {
  admissionNo: string;
  firstName: string;
  lastName: string;
  /** The student's own sign-in account; null unlinks it. */
  userId?: string | null;
}

const columns = {
  id: students.id,
  admissionNo: students.admissionNo,
  firstName: students.firstName,
  lastName: students.lastName,
  userId: students.userId,
};

/** Treats the search text literally: % and _ are wildcards in LIKE. */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * Reference feature module. Copy this shape for new modules:
 * controller (HTTP only) -> service (logic) -> TenantDb (data, tenant-scoped).
 */
@Injectable()
export class StudentsService {
  constructor(private readonly tenantDb: TenantDb) {}

  /** No tenant filter needed here: row-level security applies it. */
  list(filter: { q?: string } = {}) {
    const search: SQL | undefined = filter.q
      ? or(
          ilike(students.firstName, contains(filter.q)),
          ilike(students.lastName, contains(filter.q)),
          ilike(students.admissionNo, contains(filter.q)),
        )
      : undefined;
    return this.tenantDb.run((tx) =>
      tx
        .select(columns)
        .from(students)
        .where(search)
        .orderBy(asc(students.lastName), asc(students.firstName)),
    );
  }

  /** One student, with the class they are in for each session, newest first. */
  async get(id: string) {
    return this.tenantDb.run(async (tx) => {
      const [student] = await tx
        .select(columns)
        .from(students)
        .where(eq(students.id, id));
      if (!student) throw new NotFoundException('Student not found');
      const placements = await tx
        .select({
          sessionId: academicSessions.id,
          sessionName: academicSessions.name,
          classId: classes.id,
          className: classes.name,
        })
        .from(enrolments)
        .innerJoin(
          classes,
          and(
            eq(classes.tenantId, enrolments.tenantId),
            eq(classes.id, enrolments.classId),
          ),
        )
        .innerJoin(
          academicSessions,
          and(
            eq(academicSessions.tenantId, enrolments.tenantId),
            eq(academicSessions.id, enrolments.sessionId),
          ),
        )
        .where(eq(enrolments.studentId, id))
        .orderBy(desc(academicSessions.startsOn));
      return {
        ...student,
        enrolments: placements.map((p) => ({
          session: { id: p.sessionId, name: p.sessionName },
          class: { id: p.classId, name: p.className },
        })),
      };
    });
  }

  /** A duplicate admission number, or an account already linked to someone else, is a 409. */
  create(input: StudentInput) {
    return this.tenantDb.run(async (tx, tenant) => {
      await assertActiveUser(tx, input.userId, ['student'], 'The account');
      const [created] = await tx
        .insert(students)
        .values({ ...input, tenantId: tenant.id })
        .returning(columns);
      return created;
    });
  }

  async update(id: string, patch: Partial<StudentInput>) {
    const [updated] = await this.tenantDb.run(async (tx) => {
      await assertActiveUser(tx, patch.userId, ['student'], 'The account');
      return tx
        .update(students)
        .set(patch)
        .where(eq(students.id, id))
        .returning(columns);
    });
    if (!updated) throw new NotFoundException('Student not found');
    return updated;
  }
}
