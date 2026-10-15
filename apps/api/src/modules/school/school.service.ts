import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import { schoolLogos, tenants } from '../../database/schema.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { InjectDb, type Database } from '../../database/tokens.js';
import { schoolOrigin } from '../../tenancy/school-url.js';
import { TENANT_KEY, type Tenant } from '../../tenancy/tenant.js';
import { sniffImage } from './image.js';

export const LOGO_MAX_BYTES = 200 * 1024;

/** The school at this address: its public profile, and the admin's edits to it (ADR 0010). */
@Injectable()
export class SchoolService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly tenantDb: TenantDb,
    private readonly cls: ClsService,
    @InjectEnv() private readonly env: Env,
  ) {}

  /** Read fresh, not from the registry cache, so a rename shows straight away. */
  async profile() {
    const { id } = this.cls.get<Tenant>(TENANT_KEY);
    const [school] = await this.db
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
      .where(eq(tenants.id, id));
    const { customDomain, logoUpdatedAt, ...rest } = school!;
    return {
      ...rest,
      url: schoolOrigin(this.env, { slug: rest.slug, customDomain }),
      // Relative: the web app calls the API under /api on its own origin.
      logoUrl: logoUpdatedAt
        ? `/api/school/logo?v=${logoUpdatedAt.getTime()}`
        : null,
    };
  }

  /** Name and colour live in the registry, which only update_school_profile() may change. */
  async update(patch: { name?: string; brandColor?: string | null }) {
    const current = await this.profile();
    await this.tenantDb.run((tx) =>
      tx.execute(
        sql`select update_school_profile(${patch.name ?? current.name}, ${
          patch.brandColor === undefined ? current.brandColor : patch.brandColor
        })`,
      ),
    );
    return this.profile();
  }

  async logo() {
    // school_logos is readable across schools (logos are public): filter by school explicitly.
    const [logo] = await this.tenantDb.run((tx, tenant) =>
      tx
        .select({
          contentType: schoolLogos.contentType,
          content: schoolLogos.content,
        })
        .from(schoolLogos)
        .where(eq(schoolLogos.tenantId, tenant.id)),
    );
    if (!logo) throw new NotFoundException('This school has no logo');
    return logo;
  }

  async setLogo(content: Buffer) {
    const contentType = sniffImage(content);
    if (!contentType) {
      throw new UnprocessableEntityException(
        'The logo must be a PNG, JPEG or WebP image',
      );
    }
    await this.tenantDb.run((tx, tenant) =>
      tx
        .insert(schoolLogos)
        .values({ tenantId: tenant.id, contentType, content })
        .onConflictDoUpdate({
          target: schoolLogos.tenantId,
          set: { contentType, content, updatedAt: sql`now()` },
        }),
    );
    return this.profile();
  }

  async removeLogo() {
    await this.tenantDb.run((tx, tenant) =>
      tx.delete(schoolLogos).where(eq(schoolLogos.tenantId, tenant.id)),
    );
  }
}
