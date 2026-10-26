import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { assertActiveUser } from '../../common/assert-active-user.js';
import {
  academicSessions,
  classes,
  enrolments,
  guardians,
  studentGuardians,
  students,
} from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import { CONSENT_WORDING } from '../consents/wording.js';
import { StudentsService } from '../students/students.service.js';
import type { AddGuardianBody, UpdateGuardianBody } from './guardians.dto.js';
import { myStudentIds } from './my-students.js';

const columns = {
  id: guardians.id,
  name: guardians.name,
  phone: guardians.phone,
  email: guardians.email,
  userId: guardians.userId,
};

const contains = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const linkedGuardian = and(
  eq(guardians.tenantId, studentGuardians.tenantId),
  eq(guardians.id, studentGuardians.guardianId),
);

/** Parents and guardians of students (ADR 0015), and the children a parent signs in for. */
@Injectable()
export class GuardiansService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
    private readonly students: StudentsService,
  ) {}

  forStudent(studentId: string) {
    return this.tenantDb.run(async (tx) => {
      await findStudent(tx, studentId);
      return this.listFor(tx, studentId);
    });
  }

  /** A guardian already linked to this student is a 409 (primary key). */
  add(studentId: string, input: AddGuardianBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      await findStudent(tx, studentId);
      let guardianId: string;
      if ('guardianId' in input) {
        const [found] = await tx
          .select({ id: guardians.id })
          .from(guardians)
          .where(eq(guardians.id, input.guardianId));
        if (!found) {
          throw new UnprocessableEntityException('Guardian not found');
        }
        guardianId = found.id;
      } else {
        const { relationship: _, ...details } = input;
        await assertActiveUser(tx, details.userId, ['parent'], 'The account');
        const [created] = await tx
          .insert(guardians)
          .values({ ...details, tenantId: tenant.id })
          .returning({ id: guardians.id });
        guardianId = created.id;
      }
      await tx.insert(studentGuardians).values({
        tenantId: tenant.id,
        studentId,
        guardianId,
        relationship: input.relationship,
      });
      return (await this.listFor(tx, studentId)).find(
        (g) => g.id === guardianId,
      );
    });
  }

  async update(id: string, patch: UpdateGuardianBody) {
    const [updated] = await this.tenantDb.run(async (tx) => {
      await assertActiveUser(tx, patch.userId, ['parent'], 'The account');
      return tx
        .update(guardians)
        .set(patch)
        .where(eq(guardians.id, id))
        .returning(columns);
    });
    if (!updated) throw new NotFoundException('Guardian not found');
    return updated;
  }

  /** A guardian with no children left at the school is removed too. */
  unlink(studentId: string, guardianId: string) {
    return this.tenantDb.run(async (tx) => {
      const removed = await tx
        .delete(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, guardianId),
          ),
        )
        .returning({ id: studentGuardians.guardianId });
      if (removed.length === 0) {
        throw new NotFoundException('Guardian not found');
      }
      const [another] = await tx
        .select({ id: studentGuardians.studentId })
        .from(studentGuardians)
        .where(eq(studentGuardians.guardianId, guardianId))
        .limit(1);
      if (!another) {
        await tx.delete(guardians).where(eq(guardians.id, guardianId));
      }
    });
  }

  /** For linking a sibling to a parent already on record: by name or phone. */
  search(q: string | undefined) {
    return this.tenantDb.run(async (tx) => {
      const found = await tx
        .select(columns)
        .from(guardians)
        .where(
          q
            ? or(
                ilike(guardians.name, contains(q)),
                ilike(guardians.phone, contains(q.replace(/^0/, ''))),
              )
            : undefined,
        )
        .orderBy(asc(guardians.name))
        .limit(20);
      if (found.length === 0) return [];
      const children = await tx
        .select({
          guardianId: studentGuardians.guardianId,
          child: {
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
          },
        })
        .from(studentGuardians)
        .innerJoin(
          students,
          and(
            eq(students.tenantId, studentGuardians.tenantId),
            eq(students.id, studentGuardians.studentId),
          ),
        )
        .where(
          inArray(
            studentGuardians.guardianId,
            found.map((g) => g.id),
          ),
        );
      return found.map((guardian) => ({
        ...guardian,
        children: children
          .filter((c) => c.guardianId === guardian.id)
          .map((c) => c.child),
      }));
    });
  }

  /** A parent's children, each with the class they are in for the latest session. */
  children() {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx) => {
      const rows = await tx
        .select({
          id: students.id,
          admissionNo: students.admissionNo,
          firstName: students.firstName,
          lastName: students.lastName,
          classId: classes.id,
          className: classes.name,
        })
        .from(students)
        .leftJoin(
          enrolments,
          and(
            eq(enrolments.tenantId, students.tenantId),
            eq(enrolments.studentId, students.id),
          ),
        )
        .leftJoin(
          classes,
          and(
            eq(classes.tenantId, enrolments.tenantId),
            eq(classes.id, enrolments.classId),
          ),
        )
        .leftJoin(
          academicSessions,
          and(
            eq(academicSessions.tenantId, enrolments.tenantId),
            eq(academicSessions.id, enrolments.sessionId),
          ),
        )
        .where(inArray(students.id, myStudentIds(tx, userId)))
        .orderBy(
          asc(students.firstName),
          asc(students.id),
          desc(academicSessions.startsOn),
        );
      const seen = new Set<string>();
      return rows
        .filter((row) => !seen.has(row.id) && seen.add(row.id))
        .map(({ classId, className, ...child }) => ({
          ...child,
          class: classId ? { id: classId, name: className } : null,
        }));
    });
  }

  /**
   * A child's whole record as the school holds it, for their parent to check (NDPA
   * s. 34). Other guardians show by name only: separated parents need not see each
   * other's numbers.
   */
  async child(studentId: string) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    const family = await this.tenantDb.run(async (tx) => {
      const mine = await myStudentIds(tx, userId);
      if (!mine.some((s) => s.id === studentId)) {
        throw new NotFoundException('Student not found');
      }
      return (await this.listFor(tx, studentId)).map(
        ({ userId: guardianUser, ...guardian }) =>
          guardianUser === userId
            ? { ...guardian, you: true }
            : { ...guardian, phone: null, email: null, you: false },
      );
    });
    const { userId: _account, ...record } = await this.students.get(studentId);
    return { ...record, guardians: family, consentWording: CONSENT_WORDING };
  }

  private listFor(tx: Transaction, studentId: string) {
    return tx
      .select({ ...columns, relationship: studentGuardians.relationship })
      .from(studentGuardians)
      .innerJoin(guardians, linkedGuardian)
      .where(eq(studentGuardians.studentId, studentId))
      .orderBy(asc(studentGuardians.createdAt));
  }
}

async function findStudent(tx: Transaction, id: string) {
  const [student] = await tx
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, id));
  if (!student) throw new NotFoundException('Student not found');
}
