import { cacheLife } from 'next/cache';

/** Shape returned by the API's GET /showcase/schools (schools that opted in). */
export interface ShowcaseSchool {
  name: string;
  slug: string;
  city: string | null;
  logoUrl: string | null;
}

const API_URL = process.env.DOPPLE_API_URL ?? 'http://localhost:3000';

/**
 * Partner schools for the logo wall. Cached for minutes: the list changes rarely
 * and the landing page is the busiest page we have. If the API is unreachable
 * we return an empty list and the section hides itself, rather than failing the page.
 */
export async function getShowcaseSchools(): Promise<ShowcaseSchool[]> {
  'use cache';
  cacheLife('minutes');

  try {
    const res = await fetch(`${API_URL}/showcase/schools`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { schools: ShowcaseSchool[] };
    return body.schools;
  } catch {
    return [];
  }
}

/** Hide the wall until there are enough schools for it to look intentional. */
export const SHOWCASE_MIN_SCHOOLS = Number(
  process.env.SHOWCASE_MIN_SCHOOLS ?? 6,
);

const CREST_COLORS = [
  '#2F7A55',
  '#2B5FD9',
  '#B4432F',
  '#6D4BC3',
  '#D08A00',
  '#1F6F78',
  '#9D2B5B',
  '#3F6212',
  '#C2410C',
  '#4338CA',
];

/** Stable colour and initials for schools that haven't uploaded a logo yet. */
export function crestFor(school: ShowcaseSchool) {
  const hash = [...school.slug].reduce(
    (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
    7,
  );
  const initials = school.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return { color: CREST_COLORS[hash % CREST_COLORS.length]!, initials };
}
