import { useEffect } from 'react';
import { DEFAULT_SCHOOL_COLOR, textOn } from '../lib/color';
import { useSchool } from '../lib/queries';

const STORAGE_KEY = 'dopple:school-colors';

/**
 * Paints the app in the school's colours: the main one, and an accent for highlights
 * (the main one again if the school has none). Remembered per browser so a reload
 * doesn't flash Dopple green.
 */
export function applySchoolColors(main: string | null, accent: string | null) {
  const school = main ?? DEFAULT_SCHOOL_COLOR;
  const highlight = accent ?? school;
  const root = document.documentElement.style;
  root.setProperty('--color-school', school);
  root.setProperty('--color-on-school', textOn(school));
  root.setProperty('--color-accent', highlight);
  root.setProperty('--color-on-accent', textOn(highlight));
  try {
    localStorage.setItem(STORAGE_KEY, `${school} ${highlight}`);
  } catch {
    // Private mode or storage blocked: the colours still apply, they just aren't remembered.
  }
}

export function applyRememberedSchoolColors() {
  try {
    const [main, accent] = (localStorage.getItem(STORAGE_KEY) ?? '').split(' ');
    const hex = /^#[0-9a-f]{6}$/;
    if (main && accent && hex.test(main) && hex.test(accent))
      applySchoolColors(main, accent);
  } catch {
    // Nothing remembered: the default colours stay until the school loads.
  }
}

export function SchoolTheme() {
  const school = useSchool().data;
  useEffect(() => {
    if (school) {
      applySchoolColors(school.brandColor, school.accentColor);
      document.title = `${school.name} · Dopple`;
    }
  }, [school]);
  return null;
}

/** The school's logo, or its first letter on the school colour. */
export function SchoolBadge({ size }: { size: 'sm' | 'lg' }) {
  const school = useSchool().data;
  const box =
    size === 'sm'
      ? 'size-9 rounded-[10px] text-lg'
      : 'size-12 rounded-xl text-2xl';
  if (school?.logoUrl) {
    return (
      <img
        src={school.logoUrl}
        alt={`${school.name} logo`}
        className={`${box} shrink-0 bg-paper object-contain p-0.5`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center bg-school font-display font-bold text-on-school`}
    >
      {school?.name[0] ?? ''}
    </span>
  );
}
