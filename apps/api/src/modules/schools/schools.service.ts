import { ConflictException, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { pgErrorCode } from '../../common/database-error.filter.js';
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import { schoolLogos, tenants } from '../../database/schema.js';
import { InjectDb, type Database } from '../../database/tokens.js';
import { schoolOrigin } from '../../tenancy/school-url.js';
import { TenantRegistry } from '../../tenancy/tenant-registry.service.js';
import { hashPassword } from '../auth/password.js';
import type { CreateSchoolBody } from './schools.dto.js';

const contains = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * Platform-level: find a school to sign in to, and create new ones (ADR 0010).
 * `tenants` is the registry, not tenant-owned data, so the plain DB client is
 * right here; the app role can only read it, and creates schools through the
 * create_school() function.
 */
@Injectable()
export class SchoolsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly registry: TenantRegistry,
    @InjectEnv() private readonly env: Env,
  ) {}

  /** Up to 8 active schools whose name or address contains `q`. Never the whole list. */
  async search(q: string) {
    const rows = await this.db
      .select({
        slug: tenants.slug,
        name: tenants.name,
        city: tenants.city,
        brandColor: tenants.brandColor,
        customDomain: tenants.customDomain,
        logoUpdatedAt: schoolLogos.updatedAt,
      })
      .from(tenants)
      .leftJoin(schoolLogos, eq(schoolLogos.tenantId, tenants.id))
      .where(
        and(
          eq(tenants.status, 'active'),
          or(
            ilike(tenants.name, contains(q)),
            ilike(tenants.slug, contains(q)),
          ),
        ),
      )
      .orderBy(asc(tenants.name))
      .limit(8);
    return rows.map(({ customDomain, logoUpdatedAt, ...school }) => {
      const url = schoolOrigin(this.env, { slug: school.slug, customDomain });
      return {
        ...school,
        url,
        signInUrl: `${url}/sign-in`,
        logoUrl: logoUpdatedAt
          ? `${url}/api/school/logo?v=${logoUpdatedAt.getTime()}`
          : null,
      };
    });
  }

  /** For the sign-up form's live check. The real guarantee is the unique constraint. */
  async isAvailable(slug: string): Promise<boolean> {
    const [taken] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return !taken;
  }

  async create(input: CreateSchoolBody) {
    const passwordHash = await hashPassword(input.password);
    try {
      await this.db.execute(sql`select create_school(
        ${input.slug}, ${input.name}, ${input.city ?? null}, ${input.brandColor ?? null},
        ${input.adminEmail}, ${input.adminName}, ${passwordHash}
      )`);
    } catch (error) {
      if (pgErrorCode(error) === '23505') {
        throw new ConflictException('That address is already taken');
      }
      throw error;
    }
    // Someone may have visited the address before it existed; don't keep saying "no such school".
    this.registry.forget(input.slug);
    const url = schoolOrigin(this.env, { slug: input.slug });
    const email = encodeURIComponent(input.adminEmail.trim().toLowerCase());
    return {
      slug: input.slug,
      name: input.name,
      url,
      signInUrl: `${url}/sign-in?email=${email}&welcome=1`,
    };
  }
}
