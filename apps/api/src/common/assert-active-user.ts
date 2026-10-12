import { UnprocessableEntityException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { users, type UserRole } from '../database/schema.js';
import type { Transaction } from '../database/tenant-db.service.js';

/** 422 unless the user is active at this school and has one of the roles. Null means "nobody". */
export async function assertActiveUser(
  tx: Transaction,
  userId: string | null | undefined,
  roles: UserRole[],
  label: string,
): Promise<void> {
  if (!userId) return;
  const [user] = await tx
    .select({ role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'active')));
  if (!user || !roles.includes(user.role)) {
    throw new UnprocessableEntityException(
      `${label} must be an active ${roles.join(' or ')}`,
    );
  }
}
