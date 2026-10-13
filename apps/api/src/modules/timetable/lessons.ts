import { ConflictException } from '@nestjs/common';
import { and, asc, eq, gt, lt, ne, type SQL } from 'drizzle-orm';
import {
  classes,
  classSubjects,
  subjects,
  timetableSlots,
  users,
} from '../../database/schema.js';
import type { Transaction } from '../../database/tenant-db.service.js';

/** When a period happens. Times are "HH:MM". */
export interface Slot {
  termId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
}

/** Postgres returns "08:00:00"; the API speaks "08:00". */
const hhmm = (time: string) => time.slice(0, 5);

const DAYS = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Timetable periods with their class, subject and (current) subject teacher. */
export async function selectLessons(tx: Transaction, where: SQL | undefined) {
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

/**
 * 409 if the teacher already has a lesson in another class at that time.
 * Locking the teacher's row makes two admins timetabling the same teacher at once
 * take turns, so neither can slip a clash past the other.
 */
export async function assertTeacherFree(
  tx: Transaction,
  teacherId: string,
  classId: string,
  slot: Slot,
) {
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, teacherId))
    .for('update');
  const [clash] = await selectLessons(
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
      `${clash.teacher?.name} already teaches ${clash.class.name} ${clash.subject.code} on ${DAYS[clash.weekday]} from ${clash.startsAt} to ${clash.endsAt}`,
    );
  }
}
