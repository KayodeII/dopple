/** Server-side calls to the API's platform endpoints for finding and creating schools (ADR 0010). */

export const API_URL = process.env.DOPPLE_API_URL ?? 'http://localhost:3000';

/** Where schools live, shown next to the address field: greenfield.<this>. */
export const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? 'dopple.school';

export interface FoundSchool {
  slug: string;
  name: string;
  city: string | null;
  brandColor: string | null;
  url: string;
  signInUrl: string;
  logoUrl: string | null;
}

export interface Availability {
  slug: string;
  available: boolean;
  reason: string | null;
}

/** "St. Mary's College, Ikeja" → "st-marys-college-ikeja". The API has the final say. */
export function suggestAddress(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}
