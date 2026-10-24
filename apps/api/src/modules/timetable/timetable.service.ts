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
  timetableSlots,
} from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import { findClassSession } from '../classes/lookups.js';
import { myStudentIds } from '../guardians/my-students.js';
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

  /**
   * A teacher's lessons across classes, a student's own class timetable, or the
   * timetable of one of a parent's children.
   */
  forMe(termId: string, studentId?: string) {
    const { userId, role } = this.cls.get<Principal>(PRINCIPAL_KEY);
    if (role === 'parent' && !studentId) {
      throw new UnprocessableEntityException('Choose which child');
    }
    return this.tenantDb.run(async (tx) => {
      if (role !== 'student' && role !== 'parent') {
        return selectLessons(
          tx,
          and(
            eq(timetableSlots.termId, termId),
            eq(classSubjects.teacherId, userId),
          ),
        );
      }
      const mine = (await myStudentIds(tx, userId)).map((s) => s.id);
      if (studentId && !mine.includes(studentId)) {
        throw new NotFoundException('Student not found');
      }
      return selectLessons(
        tx,
        and(
          eq(timetableSlots.termId, termId),
          inArray(
            timetableSlots.classId,
            tx
              .select({ classId: enrolments.classId })
              .from(enrolments)
              .where(
                inArray(enrolments.studentId, studentId ? [studentId] : mine),
              ),
          ),
        ),
      );
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
