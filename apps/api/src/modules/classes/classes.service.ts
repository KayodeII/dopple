import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { classes, users } from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';

export interface ClassInput {
  sessionId: string;
  name: string;
  level: string;
  formTeacherId?: string | null;
}

const columns = {
  id: classes.id,
  sessionId: classes.sessionId,
  name: classes.name,
  level: classes.level,
  formTeacherId: classes.formTeacherId,
};

@Injectable()
export class ClassesService {
  constructor(private readonly tenantDb: TenantDb) {}

  list(filter: { sessionId?: string }) {
    return this.tenantDb.run((tx) =>
      this.select(
        tx,
        filter.sessionId ? eq(classes.sessionId, filter.sessionId) : undefined,
      ),
    );
  }

  /** 404 also covers another school's class: row-level security hides it. */
  async get(id: string) {
    const [found] = await this.tenantDb.run((tx) =>
      this.select(tx, eq(classes.id, id)),
    );
    if (!found) throw new NotFoundException('Class not found');
    return found;
  }

  async create(input: ClassInput) {
    const id = await this.tenantDb.run(async (tx, tenant) => {
      await this.assertCanBeFormTeacher(tx, input.formTeacherId);
      const [row] = await tx
        .insert(classes)
        .values({ ...input, tenantId: tenant.id })
        .returning({ id: classes.id });
      return row.id;
    });
    return this.get(id);
  }

  async update(id: string, patch: Partial<Omit<ClassInput, 'sessionId'>>) {
    const updated = await this.tenantDb.run(async (tx) => {
      await this.assertCanBeFormTeacher(tx, patch.formTeacherId);
      return tx
        .update(classes)
        .set(patch)
        .where(eq(classes.id, id))
        .returning(columns);
    });
    if (!updated.length) throw new NotFoundException('Class not found');
    return this.get(id);
  }

  private async select(tx: Transaction, where: SQL | undefined) {
    const rows = await tx
      .select(columns)
      .from(classes)
      .where(where)
      .orderBy(asc(classes.name));
    const teacherIds = [
      ...new Set(
        rows.flatMap((r) => (r.formTeacherId ? [r.formTeacherId] : [])),
      ),
    ];
    const teachers = teacherIds.length
      ? await tx
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, teacherIds))
      : [];
    return rows.map(({ formTeacherId, ...row }) => ({
      ...row,
      formTeacher: teachers.find((t) => t.id === formTeacherId) ?? null,
    }));
  }

  private async assertCanBeFormTeacher(
    tx: Transaction,
    userId: string | null | undefined,
  ) {
    if (!userId) return;
    const [user] = await tx
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'active')));
    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      throw new UnprocessableEntityException(
        'The form teacher must be an active teacher or admin',
      );
    }
  }
}
