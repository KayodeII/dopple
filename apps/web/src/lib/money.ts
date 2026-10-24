/** Money is kobo (integers) everywhere except on screen. */

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 5000000 → "₦50,000". */
export const formatNaira = (kobo: number) => naira.format(kobo / 100);

/** What someone types ("50,000", "₦1,500.50") → kobo, or null if it isn't an amount. */
export function parseNaira(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.replace(/[₦,\s]/g, ''));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}
