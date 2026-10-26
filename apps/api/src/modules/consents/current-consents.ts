import { UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  CONSENT_PURPOSES,
  consents,
  guardians,
  studentGuardians,
  type ConsentPurpose,
} from '../../database/schema.js';
import type { Transaction } from '../../database/tenant-db.service.js';

/**
 * Where each purpose stands for a student: the newest answer from a guardian who is
 * still linked to them, or null if nobody has answered. An unlinked guardian's
 * answer stops counting.
 */
export async function currentConsents(tx: Transaction, studentId: string) {
  const rows = await tx
    .selectDistinctOn([consents.purpose], {
      purpose: consents.purpose,
      given: consents.given,
      method: consents.method,
      wording: consents.wording,
      at: consents.createdAt,
      guardian: { id: guardians.id, name: guardians.name },
      relationship: studentGuardians.relationship,
    })
    .from(consents)
    .innerJoin(
      studentGuardians,
      and(
        eq(studentGuardians.tenantId, consents.tenantId),
        eq(studentGuardians.studentId, consents.studentId),
        eq(studentGuardians.guardianId, consents.guardianId),
      ),
    )
    .innerJoin(
      guardians,
      and(
        eq(guardians.tenantId, consents.tenantId),
        eq(guardians.id, consents.guardianId),
      ),
    )
    .where(eq(consents.studentId, studentId))
    .orderBy(consents.purpose, desc(consents.createdAt));
  return Object.fromEntries(
    CONSENT_PURPOSES.map((purpose) => {
      const row = rows.find((r) => r.purpose === purpose);
      if (!row) return [purpose, null];
      const { purpose: _, ...answer } = row;
      return [purpose, answer];
    }),
  ) as Record<ConsentPurpose, Omit<(typeof rows)[number], 'purpose'> | null>;
}

const missing: Record<'health' | 'photo', string> = {
  health: 'A parent must agree to the school keeping health details first',
  photo: 'A parent must agree to the school keeping a photo first',
};

/** 422 unless a parent has agreed to the school keeping this about the child. */
export async function assertConsent(
  tx: Transaction,
  studentId: string,
  purpose: 'health' | 'photo',
) {
  const answer = (await currentConsents(tx, studentId))[purpose];
  if (!answer?.given) throw new UnprocessableEntityException(missing[purpose]);
}
