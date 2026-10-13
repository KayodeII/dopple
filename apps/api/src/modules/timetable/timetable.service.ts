import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import {
  classSubjects,
  enrolments,
  students,
  timetableSlots,
} from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import { findClassSession } from '../classes/lookups.js';
import type { CreateSlotBody } from './timetable.dto.js';
import { assertTeacherFree, selectLessons } from './lessons.js';

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
      return selectLessons(
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
      return selectLessons(tx, and(eq(timetableSlots.termId, termId), mine));
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
        await assertTeacherFree(tx, taken.teacherId, classId, input);

      // Overlaps within the class are refused by the timetable_slots_no_overlap constraint (409).
      const [row] = await tx
        .insert(timetableSlots)
        .values({ ...input, tenantId: tenant.id, sessionId, classId })
        .returning({ id: timetableSlots.id });
      const [lesson] = await selectLessons(tx, eq(timetableSlots.id, row.id));
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
}
