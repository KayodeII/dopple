import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import {
  recordCorrections,
  studentHealth,
  students,
  users,
  type CorrectionChanges,
} from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import { assertConsent } from '../consents/current-consents.js';
import { myStudentIds } from '../guardians/my-students.js';
import {
  HEALTH_FIELDS,
  RECORD_FIELDS,
  type RequestCorrectionBody,
} from './corrections.dto.js';

const healthColumns = {
  bloodGroup: studentHealth.bloodGroup,
  genotype: studentHealth.genotype,
  allergies: studentHealth.allergies,
  conditions: studentHealth.conditions,
};

const pick = (changes: CorrectionChanges, fields: string[]) =>
  Object.fromEntries(
    Object.entries(changes).filter(([field]) => fields.includes(field)),
  );

/**
 * Parents ask for corrections to their child's record (ADR 0017); admins apply or
 * decline them. Applying writes exactly what the parent asked for.
 */
@Injectable()
export class CorrectionsService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
  ) {}

  /** Health changes need the health consent first: we would be keeping them already. */
  request(studentId: string, input: RequestCorrectionBody) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx, tenant) => {
      await assertMine(tx, userId, studentId);
      if (Object.keys(pick(input.changes, HEALTH_FIELDS)).length > 0) {
        await assertConsent(tx, studentId, 'health');
      }
      const [created] = await tx
        .insert(recordCorrections)
        .values({
          tenantId: tenant.id,
          studentId,
          requestedBy: userId,
          changes: input.changes,
          note: input.note,
        })
        .returning(parentColumns);
      return created;
    });
  }

  /** What this parent has asked for about this child, newest first. */
  mine(studentId: string) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx) => {
      await assertMine(tx, userId, studentId);
      return tx
        .select(parentColumns)
        .from(recordCorrections)
        .where(
          and(
            eq(recordCorrections.studentId, studentId),
            eq(recordCorrections.requestedBy, userId),
          ),
        )
        .orderBy(desc(recordCorrections.createdAt));
    });
  }

  /** Open requests, oldest first, each with what the record holds now. */
  pending(studentId?: string) {
    return this.tenantDb.run(async (tx) => {
      const rows = await tx
        .select({
          id: recordCorrections.id,
          changes: recordCorrections.changes,
          note: recordCorrections.note,
          createdAt: recordCorrections.createdAt,
          requestedBy: { id: users.id, name: users.name },
          student: students,
          health: healthColumns,
        })
        .from(recordCorrections)
        .innerJoin(
          students,
          and(
            eq(students.tenantId, recordCorrections.tenantId),
            eq(students.id, recordCorrections.studentId),
          ),
        )
        .innerJoin(
          users,
          and(
            eq(users.tenantId, recordCorrections.tenantId),
            eq(users.id, recordCorrections.requestedBy),
          ),
        )
        .leftJoin(
          studentHealth,
          and(
            eq(studentHealth.tenantId, students.tenantId),
            eq(studentHealth.studentId, students.id),
          ),
        )
        .where(
          and(
            eq(recordCorrections.status, 'pending'),
            studentId ? eq(recordCorrections.studentId, studentId) : undefined,
          ),
        )
        .orderBy(asc(recordCorrections.createdAt));
      return rows.map(({ student, health, ...correction }) => {
        const now: Record<string, unknown> = { ...student, ...health };
        return {
          ...correction,
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
          },
          current: Object.fromEntries(
            Object.keys(correction.changes).map((field) => [
              field,
              now[field] ?? null,
            ]),
          ),
        };
      });
    });
  }

  apply(id: string) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx, tenant) => {
      const correction = await openCorrection(tx, id);
      const record = pick(correction.changes, RECORD_FIELDS);
      const health = pick(correction.changes, HEALTH_FIELDS);
      if (Object.keys(record).length > 0) {
        await tx
          .update(students)
          .set(record)
          .where(eq(students.id, correction.studentId));
      }
      if (Object.keys(health).length > 0) {
        await this.mergeHealth(tx, tenant.id, correction.studentId, health);
      }
      return decide(tx, id, { status: 'applied', decidedBy: userId });
    });
  }

  decline(id: string, reply: string) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx) => {
      await openCorrection(tx, id);
      return decide(tx, id, { status: 'declined', decidedBy: userId, reply });
    });
  }

  /** Changes only the asked-for health fields; an all-blank record is removed. */
  private async mergeHealth(
    tx: Transaction,
    tenantId: string,
    studentId: string,
    changes: CorrectionChanges,
  ) {
    const [existing] = await tx
      .select(healthColumns)
      .from(studentHealth)
      .where(eq(studentHealth.studentId, studentId));
    const none = {
      bloodGroup: null,
      genotype: null,
      allergies: null,
      conditions: null,
    };
    const merged = { ...(existing ?? none), ...changes } as Pick<
      typeof studentHealth.$inferInsert,
      keyof typeof healthColumns
    >;
    if (Object.values(merged).every((value) => value === null)) {
      await tx
        .delete(studentHealth)
        .where(eq(studentHealth.studentId, studentId));
      return;
    }
    await assertConsent(tx, studentId, 'health');
    await tx
      .insert(studentHealth)
      .values({ tenantId, studentId, ...merged })
      .onConflictDoUpdate({
        target: [studentHealth.tenantId, studentHealth.studentId],
        set: { ...merged, updatedAt: sql`now()` },
      });
  }
}

const parentColumns = {
  id: recordCorrections.id,
  changes: recordCorrections.changes,
  note: recordCorrections.note,
  status: recordCorrections.status,
  reply: recordCorrections.reply,
  createdAt: recordCorrections.createdAt,
  decidedAt: recordCorrections.decidedAt,
};

async function assertMine(tx: Transaction, userId: string, studentId: string) {
  const [mine] = await tx
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.id, studentId),
        inArray(students.id, myStudentIds(tx, userId)),
      ),
    );
  if (!mine) throw new NotFoundException('Student not found');
}

/** Locks the request so two admins cannot decide it at once. */
async function openCorrection(tx: Transaction, id: string) {
  const [correction] = await tx
    .select({
      studentId: recordCorrections.studentId,
      changes: recordCorrections.changes,
      status: recordCorrections.status,
    })
    .from(recordCorrections)
    .where(eq(recordCorrections.id, id))
    .for('update');
  if (!correction) throw new NotFoundException('Correction not found');
  if (correction.status !== 'pending') {
    throw new ConflictException('This correction has already been decided');
  }
  return correction;
}

async function decide(
  tx: Transaction,
  id: string,
  decision: {
    status: 'applied' | 'declined';
    decidedBy: string;
    reply?: string;
  },
) {
  const [decided] = await tx
    .update(recordCorrections)
    .set({ ...decision, decidedAt: sql`now()` })
    .where(eq(recordCorrections.id, id))
    .returning(parentColumns);
  return decided;
}
