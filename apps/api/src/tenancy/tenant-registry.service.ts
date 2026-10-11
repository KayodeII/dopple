import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectEnv } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { tenants } from '../database/schema.js';
import { InjectDb, type Database } from '../database/tokens.js';
import type { HostMatch } from './parse-host.js';
import type { Tenant } from './tenant.js';

interface CacheEntry {
  tenant: Tenant | null;
  expiresAt: number;
}

/**
 * Looks up which school a host belongs to, with a short in-memory cache so the
 * registry is not queried on every request. Unknown hosts are cached too.
 * Later: replace with the edge's signed x-tenant header (see architecture doc).
 */
@Injectable()
export class TenantRegistry {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    @InjectDb() private readonly db: Database,
    @InjectEnv() env: Env,
  ) {
    this.ttlMs = env.TENANT_CACHE_TTL_SECONDS * 1000;
  }

  async resolve(match: HostMatch): Promise<Tenant | null> {
    if (match.kind === 'platform') return null;

    const key =
      match.kind === 'subdomain' ? `s:${match.slug}` : `d:${match.domain}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.tenant;

    const where =
      match.kind === 'subdomain'
        ? eq(tenants.slug, match.slug)
        : eq(tenants.customDomain, match.domain);

    const [row] = await this.db
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
      .from(tenants)
      .where(and(where, eq(tenants.status, 'active')))
      .limit(1);

    const tenant = row ?? null;
    this.cache.set(key, { tenant, expiresAt: Date.now() + this.ttlMs });
    return tenant;
  }
}
