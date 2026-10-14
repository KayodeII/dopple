import { useEffect } from 'react';
import { DEFAULT_SCHOOL_COLOR, textOn } from '../lib/color';
import { useSchool } from '../lib/queries';

const STORAGE_KEY = 'dopple:school-color';

/** Paints the app in the school's colour. Remembered per browser so a reload doesn't flash Dopple green. */
export function applySchoolColor(color: string | null) {
  const school = color ?? DEFAULT_SCHOOL_COLOR;
  const root = document.documentElement.style;
  root.setProperty('--color-school', school);
  root.setProperty('--color-on-school', textOn(school));
  try {
    localStorage.setItem(STORAGE_KEY, school);
  } catch {
    // Private mode or storage blocked: the colour still applies, it just isn't remembered.
  }
}

export function applyRememberedSchoolColor() {
  try {
    const remembered = localStorage.getItem(STORAGE_KEY);
    if (remembered && /^#[0-9a-f]{6}$/.test(remembered))
      applySchoolColor(remembered);
  } catch {
    // Nothing remembered: the default colour stays until the school loads.
  }
}

export function SchoolTheme() {
  const school = useSchool().data;
  useEffect(() => {
    if (school) {
      applySchoolColor(school.brandColor);
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
