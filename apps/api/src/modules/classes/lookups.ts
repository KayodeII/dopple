import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { classes } from '../../database/schema.js';
import type { Transaction } from '../../database/tenant-db.service.js';

/** The class's session, or 404. Another school's class is hidden by row-level security. */
export async function findClassSession(
  tx: Transaction,
  classId: string,
): Promise<string> {
  const [found] = await tx
    .select({ sessionId: classes.sessionId })
    .from(classes)
    .where(eq(classes.id, classId));
  if (!found) throw new NotFoundException('Class not found');
  return found.sessionId;
}
