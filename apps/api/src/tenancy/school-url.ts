import type { Env } from '../config/env.js';

/** The school's web app origin, e.g. https://greenfield.dopple.school (SCHOOL_URL_FORMAT). */
export function schoolOrigin(
  env: Pick<Env, 'SCHOOL_URL_FORMAT' | 'PLATFORM_DOMAIN'>,
  school: { slug: string; customDomain?: string | null },
): string {
  const host = school.customDomain ?? `${school.slug}.${env.PLATFORM_DOMAIN}`;
  return env.SCHOOL_URL_FORMAT.replace('{host}', host);
}
