import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import {
  consents,
  guardians,
  studentGuardians,
  studentHealth,
  studentPhotos,
  type ConsentPurpose,
} from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { PRINCIPAL_KEY, type Principal } from '../auth/principal.js';
import type { RecordConsentBody } from './consents.dto.js';
import { CONSENT_WORDING } from './wording.js';
import { currentConsents } from './current-consents.js';

/** Parents' consent to what the school keeps about their child (ADR 0017). */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
  ) {}

  /** An admin recording a parent's answer on a signed paper form. */
  record(studentId: string, purpose: ConsentPurpose, input: RecordConsentBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      const [link] = await tx
        .select({ guardianId: studentGuardians.guardianId })
        .from(studentGuardians)
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.guardianId, input.guardianId),
          ),
        );
      if (!link) throw new NotFoundException('Guardian not found');
      return this.answer(tx, tenant.id, studentId, purpose, {
        guardianId: link.guardianId,
        given: input.given,
        method: 'paper',
      });
    });
  }

  /** A parent answering for their own child. Someone else's child is a 404. */
  answerAsParent(studentId: string, purpose: ConsentPurpose, given: boolean) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    return this.tenantDb.run(async (tx, tenant) => {
      const [link] = await tx
        .select({ guardianId: guardians.id })
        .from(studentGuardians)
        .innerJoin(
          guardians,
          and(
            eq(guardians.tenantId, studentGuardians.tenantId),
            eq(guardians.id, studentGuardians.guardianId),
          ),
        )
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(guardians.userId, userId),
          ),
        );
      if (!link) throw new NotFoundException('Student not found');
      return this.answer(tx, tenant.id, studentId, purpose, {
        guardianId: link.guardianId,
        given,
        method: 'online',
      });
    });
  }

  /**
   * Saving a "no" for health or the photo erases what the school holds for it: the
   * wording promised to keep it only with consent. A "no" to the record itself
   * erases nothing; the school has to review it, since it may have another lawful
   * basis (running the child's schooling).
   */
  private async answer(
    tx: Transaction,
    tenantId: string,
    studentId: string,
    purpose: ConsentPurpose,
    answer: { guardianId: string; given: boolean; method: 'paper' | 'online' },
  ) {
    const { userId } = this.cls.get<Principal>(PRINCIPAL_KEY);
    await tx.insert(consents).values({
      tenantId,
      studentId,
      purpose,
      ...answer,
      wording: CONSENT_WORDING[purpose],
      recordedBy: userId,
    });
    if (!answer.given && purpose === 'health') {
      await tx
        .delete(studentHealth)
        .where(eq(studentHealth.studentId, studentId));
    }
    if (!answer.given && purpose === 'photo') {
      await tx
        .delete(studentPhotos)
        .where(eq(studentPhotos.studentId, studentId));
    }
    return currentConsents(tx, studentId);
  }
}
