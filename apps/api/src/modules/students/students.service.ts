import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { assertActiveUser } from '../../common/assert-active-user.js';
import { sniffImage } from '../../common/image.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import {
  academicSessions,
  classes,
  enrolments,
  studentHealth,
  studentPhotos,
  students,
} from '../../database/schema.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import {
  assertConsent,
  currentConsents,
} from '../consents/current-consents.js';
import { myStudentIds } from '../guardians/my-students.js';
import type {
  CreateStudentBody,
  HealthBody,
  UpdateStudentBody,
} from './students.dto.js';

export const PHOTO_MAX_BYTES = 200 * 1024;

/** What lists show: enough to find a student. */
const columns = {
  id: students.id,
  admissionNo: students.admissionNo,
  firstName: students.firstName,
  lastName: students.lastName,
  userId: students.userId,
};

/** The whole admission record, for the student's own page. */
const recordColumns = {
  ...columns,
  middleName: students.middleName,
  sex: students.sex,
  dateOfBirth: students.dateOfBirth,
  admittedOn: students.admittedOn,
  nationality: students.nationality,
  stateOfOrigin: students.stateOfOrigin,
  lga: students.lga,
  homeAddress: students.homeAddress,
  previousSchool: students.previousSchool,
  religion: students.religion,
};

const healthColumns = {
  bloodGroup: studentHealth.bloodGroup,
  genotype: studentHealth.genotype,
  allergies: studentHealth.allergies,
  conditions: studentHealth.conditions,
};

/** Treats the search text literally: % and _ are wildcards in LIKE. */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * Reference feature module. Copy this shape for new modules:
 * controller (HTTP only) -> service (logic) -> TenantDb (data, tenant-scoped).
 */
@Injectable()
export class StudentsService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
  ) {}

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

  /**
   * One student's whole record, with their class for each session (newest first),
   * health, and where their parents' consent stands.
   */
  async get(id: string) {
    return this.tenantDb.run(async (tx) => {
      const [student] = await tx
        .select({
          ...recordColumns,
          photoUpdatedAt: studentPhotos.updatedAt,
        })
        .from(students)
        .leftJoin(
          studentPhotos,
          and(
            eq(studentPhotos.tenantId, students.tenantId),
            eq(studentPhotos.studentId, students.id),
          ),
        )
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
      const [health] = await tx
        .select(healthColumns)
        .from(studentHealth)
        .where(eq(studentHealth.studentId, id));
      return {
        ...student,
        health: health ?? null,
        consents: await currentConsents(tx, id),
        enrolments: placements.map((p) => ({
          session: { id: p.sessionId, name: p.sessionName },
          class: { id: p.classId, name: p.className },
        })),
      };
    });
  }

  /** A duplicate admission number, or an account already linked to someone else, is a 409. */
  create(input: CreateStudentBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      await assertActiveUser(tx, input.userId, ['student'], 'The account');
      const [created] = await tx
        .insert(students)
        .values({ ...input, tenantId: tenant.id })
        .returning(recordColumns);
      return created;
    });
  }

  async update(id: string, patch: UpdateStudentBody) {
    const [updated] = await this.tenantDb.run(async (tx) => {
      await assertActiveUser(tx, patch.userId, ['student'], 'The account');
      return tx
        .update(students)
        .set(patch)
        .where(eq(students.id, id))
        .returning(recordColumns);
    });
    if (!updated) throw new NotFoundException('Student not found');
    return updated;
  }

  /**
   * Replaces the health record; an empty one is removed rather than kept as blanks.
   * Keeping one needs a parent's consent.
   */
  setHealth(id: string, health: HealthBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      await findStudent(tx, id);
      if (Object.values(health).every((value) => value === null)) {
        await tx.delete(studentHealth).where(eq(studentHealth.studentId, id));
        return null;
      }
      await assertConsent(tx, id, 'health');
      const [saved] = await tx
        .insert(studentHealth)
        .values({ tenantId: tenant.id, studentId: id, ...health })
        .onConflictDoUpdate({
          target: [studentHealth.tenantId, studentHealth.studentId],
          set: { ...health, updatedAt: sql`now()` },
        })
        .returning(healthColumns);
      return saved;
    });
  }

  /** Staff, the student themselves, and their parents can see the photo. */
  photo(id: string) {
    const { userId, role } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx) => {
      if (role !== 'admin' && role !== 'teacher') {
        const mine = await myStudentIds(tx, userId);
        if (!mine.some((s) => s.id === id)) {
          throw new ForbiddenException('You can only see your own photo');
        }
      }
      const [photo] = await tx
        .select({
          contentType: studentPhotos.contentType,
          content: studentPhotos.content,
        })
        .from(studentPhotos)
        .where(eq(studentPhotos.studentId, id));
      if (!photo) throw new NotFoundException('No photo yet');
      return photo;
    });
  }

  setPhoto(id: string, content: Buffer) {
    const contentType = sniffImage(content);
    if (!contentType) {
      throw new UnprocessableEntityException(
        'The photo must be a PNG, JPEG or WebP image',
      );
    }
    return this.tenantDb.run(async (tx, tenant) => {
      await findStudent(tx, id);
      await assertConsent(tx, id, 'photo');
      const [saved] = await tx
        .insert(studentPhotos)
        .values({ tenantId: tenant.id, studentId: id, contentType, content })
        .onConflictDoUpdate({
          target: [studentPhotos.tenantId, studentPhotos.studentId],
          set: { contentType, content, updatedAt: sql`now()` },
        })
        .returning({ photoUpdatedAt: studentPhotos.updatedAt });
      return saved;
    });
  }

  async removePhoto(id: string) {
    await this.tenantDb.run((tx) =>
      tx.delete(studentPhotos).where(eq(studentPhotos.studentId, id)),
    );
  }
}

async function findStudent(tx: Transaction, id: string) {
  const [student] = await tx
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, id));
  if (!student) throw new NotFoundException('Student not found');
}
