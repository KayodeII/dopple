import { Injectable } from '@nestjs/common';
import { asc, desc } from 'drizzle-orm';
import { academicSessions, terms } from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { CreateSessionBody } from './academic-sessions.dto.js';

const sessionColumns = {
  id: academicSessions.id,
  name: academicSessions.name,
  startsOn: academicSessions.startsOn,
  endsOn: academicSessions.endsOn,
};

const termColumns = {
  id: terms.id,
  sessionId: terms.sessionId,
  number: terms.number,
  name: terms.name,
  startsOn: terms.startsOn,
  endsOn: terms.endsOn,
};

type Term = Omit<typeof terms.$inferSelect, 'tenantId' | 'createdAt'>;

/** School years and their terms. Newest year first. */
@Injectable()
export class AcademicSessionsService {
  constructor(private readonly tenantDb: TenantDb) {}

  list() {
    return this.tenantDb.run(async (tx) => {
      const sessions = await tx
        .select(sessionColumns)
        .from(academicSessions)
        .orderBy(desc(academicSessions.startsOn));
      const allTerms = await tx
        .select(termColumns)
        .from(terms)
        .orderBy(asc(terms.number));
      return sessions.map((session) => ({
        ...session,
        terms: allTerms
          .filter((term) => term.sessionId === session.id)
          .map(withoutSessionId),
      }));
    });
  }

  create(input: CreateSessionBody) {
    return this.tenantDb.run(async (tx, tenant) => {
      const [session] = await tx
        .insert(academicSessions)
        .values({
          tenantId: tenant.id,
          name: input.name,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
        })
        .returning(sessionColumns);
      const created = input.terms.length
        ? await tx
            .insert(terms)
            .values(
              input.terms.map((t) => ({
                ...t,
                tenantId: tenant.id,
                sessionId: session.id,
              })),
            )
            .returning(termColumns)
        : [];
      created.sort((a, b) => a.number - b.number);
      return { ...session, terms: created.map(withoutSessionId) };
    });
  }
}

const withoutSessionId = ({ id, number, name, startsOn, endsOn }: Term) => ({
  id,
  number,
  name,
  startsOn,
  endsOn,
});
