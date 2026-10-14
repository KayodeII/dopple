/** Colour helpers for school branding: readable text on the school's colour. */

const channel = (hex: string, i: number) => {
  const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of "#rrggbb". */
export function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 0) +
    0.7152 * channel(hex, 1) +
    0.0722 * channel(hex, 2)
  );
}

/** WCAG contrast ratio between two "#rrggbb" colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

export const WHITE = '#ffffff';
export const INK = '#0b0b0a';
/** The app's background, for checking a school colour stands out against it. */
export const GROUND = '#0e0f0d';
export const DEFAULT_SCHOOL_COLOR = '#2f7a55';

/** White or near-black, whichever reads better on `background`. */
export function textOn(background: string): string {
  return contrast(WHITE, background) >= contrast(INK, background) ? WHITE : INK;
}
