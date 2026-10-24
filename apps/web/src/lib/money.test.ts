import { describe, expect, it } from 'vitest';
import { formatNaira, parseNaira } from './money';

describe('money', () => {
  it('shows kobo as naira', () => {
    expect(formatNaira(5_000_000)).toBe('₦50,000');
    expect(formatNaira(150_050)).toBe('₦1,500.5');
  });

  it('reads what people type, in kobo', () => {
    expect(parseNaira('50,000')).toBe(5_000_000);
    expect(parseNaira('₦1,500.50')).toBe(150_050);
    expect(parseNaira(' 200 ')).toBe(20_000);
    expect(parseNaira('12.345')).toBeNull();
    expect(parseNaira('fifty')).toBeNull();
    expect(parseNaira('')).toBeNull();
  });
});
