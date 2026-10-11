import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { tenants } from '../../database/schema.js';
import { InjectDb, type Database } from '../../database/tokens.js';

export interface ShowcaseSchool {
  name: string;
  slug: string;
  city: string | null;
  logoUrl: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Schools that opted in to appear on the marketing site's partner wall.
 * Public data only (name, city, logo). Cached because the landing page is hot
 * and the list changes rarely.
 */
@Injectable()
export class ShowcaseService {
  private cache: { schools: ShowcaseSchool[]; expiresAt: number } | null = null;

  constructor(@InjectDb() private readonly db: Database) {}

  async list(): Promise<ShowcaseSchool[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.schools;
    }
    const schools = await this.db
      .select({
        name: tenants.name,
        slug: tenants.slug,
        city: tenants.city,
        logoUrl: tenants.logoUrl,
      })
      .from(tenants)
      .where(and(eq(tenants.showcase, true), eq(tenants.status, 'active')))
      .orderBy(asc(tenants.name));
    this.cache = { schools, expiresAt: Date.now() + CACHE_TTL_MS };
    return schools;
  }
}
