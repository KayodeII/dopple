import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, gt, inArray, lt, ne, type SQL } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import {
  classes,
  classSubjects,
  enrolments,
  students,
  subjects,
  timetableSlots,
  users,
} from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import { findClassSession } from '../classes/lookups.js';
import type { CreateSlotBody } from './timetable.dto.js';

/** Postgres returns "08:00:00"; the API speaks "08:00". */
const hhmm = (time: string) => time.slice(0, 5);

/** Weekly lessons per class and term. Teachers come from the class's subject assignments. */
@Injectable()
export class TimetableService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
  ) {}

  forClass(classId: string, termId: string) {
    return this.tenantDb.run(async (tx) => {
      await findClassSession(tx, classId);
      return this.lessons(
        tx,
        and(
          eq(timetableSlots.classId, classId),
          eq(timetableSlots.termId, termId),
        ),
      );
    });
  }

  /** A teacher's lessons across classes, or a student's own class timetable. */
  forMe(termId: string) {
    const { userId, role } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run((tx) => {
      const mine =
        role === 'student'
          ? inArray(
              timetableSlots.classId,
              tx
                .select({ classId: enrolments.classId })
                .from(enrolments)
                .innerJoin(
                  students,
                  and(
                    eq(students.tenantId, enrolments.tenantId),
                    eq(students.id, enrolments.studentId),
                  ),
                )
                .where(eq(students.userId, userId)),
            )
          : eq(classSubjects.teacherId, userId);
      return this.lessons(tx, and(eq(timetableSlots.termId, termId), mine));
    });
  }

  create(classId: string, input: CreateSlotBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      const sessionId = await findClassSession(tx, classId);
      const [taken] = await tx
        .select({ teacherId: classSubjects.teacherId })
        .from(classSubjects)
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, input.subjectId),
          ),
        );
      if (!taken) {
        throw new UnprocessableEntityException(
          'The class does not take this subject',
        );
      }
      if (taken.teacherId)
        await this.assertTeacherFree(tx, classId, taken.teacherId, input);

      // Overlaps within the class are refused by the timetable_slots_no_overlap constraint (409).
      const [row] = await tx
        .insert(timetableSlots)
        .values({ ...input, tenantId: tenant.id, sessionId, classId })
        .returning({ id: timetableSlots.id });
      const [lesson] = await this.lessons(tx, eq(timetableSlots.id, row.id));
      return lesson;
    });
  }

  async remove(classId: string, slotId: string) {
    const removed = await this.tenantDb.run((tx) =>
      tx
        .delete(timetableSlots)
        .where(
          and(
            eq(timetableSlots.classId, classId),
            eq(timetableSlots.id, slotId),
          ),
        )
        .returning({ id: timetableSlots.id }),
    );
    if (!removed.length) throw new NotFoundException('Lesson not found');
  }

  /**
   * 409 if the subject's teacher already has a lesson in another class at that time.
   * Locking the teacher's row makes two admins timetabling the same teacher at once
   * take turns, so neither can slip a clash past the other.
   */
  private async assertTeacherFree(
    tx: Transaction,
    classId: string,
    teacherId: string,
    slot: CreateSlotBody,
  ) {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, teacherId))
      .for('update');
    const [clash] = await this.lessons(
      tx,
      and(
        eq(classSubjects.teacherId, teacherId),
        ne(timetableSlots.classId, classId),
        eq(timetableSlots.termId, slot.termId),
        eq(timetableSlots.weekday, slot.weekday),
        lt(timetableSlots.startsAt, slot.endsAt),
        gt(timetableSlots.endsAt, slot.startsAt),
      ),
    );
    if (clash) {
      throw new ConflictException(
        `${clash.teacher?.name} already teaches ${clash.class.name} ${clash.subject.code} from ${clash.startsAt} to ${clash.endsAt}`,
      );
    }
  }

  private async lessons(tx: Transaction, where: SQL | undefined) {
    const rows = await tx
      .select({
        id: timetableSlots.id,
        weekday: timetableSlots.weekday,
        startsAt: timetableSlots.startsAt,
        endsAt: timetableSlots.endsAt,
        classId: classes.id,
        className: classes.name,
        subjectId: subjects.id,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        teacherId: users.id,
        teacherName: users.name,
      })
      .from(timetableSlots)
      .innerJoin(
        classes,
        and(
          eq(classes.tenantId, timetableSlots.tenantId),
          eq(classes.id, timetableSlots.classId),
        ),
      )
      .innerJoin(
        subjects,
        and(
          eq(subjects.tenantId, timetableSlots.tenantId),
          eq(subjects.id, timetableSlots.subjectId),
        ),
      )
      .innerJoin(
        classSubjects,
        and(
          eq(classSubjects.tenantId, timetableSlots.tenantId),
          eq(classSubjects.classId, timetableSlots.classId),
          eq(classSubjects.subjectId, timetableSlots.subjectId),
        ),
      )
      .leftJoin(
        users,
        and(
          eq(users.tenantId, classSubjects.tenantId),
          eq(users.id, classSubjects.teacherId),
        ),
      )
      .where(where)
      .orderBy(
        asc(timetableSlots.weekday),
        asc(timetableSlots.startsAt),
        asc(classes.name),
      );
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      startsAt: hhmm(r.startsAt),
      endsAt: hhmm(r.endsAt),
      class: { id: r.classId, name: r.className },
      subject: { id: r.subjectId, code: r.subjectCode, name: r.subjectName },
      teacher: r.teacherId ? { id: r.teacherId, name: r.teacherName } : null,
    }));
  }
}
