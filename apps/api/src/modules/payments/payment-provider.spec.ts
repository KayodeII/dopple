import { decimalToMinor, minorToDecimal } from './payment-provider.js';

describe('money conversion', () => {
  it('turns kobo into a decimal string and back without losing a kobo', () => {
    expect(minorToDecimal(0)).toBe('0.00');
    expect(minorToDecimal(5)).toBe('0.05');
    expect(minorToDecimal(7_500_000)).toBe('75000.00');
    expect(minorToDecimal(123_45)).toBe('123.45');
    expect(decimalToMinor('75000.00')).toBe(7_500_000);
    expect(decimalToMinor('0.1')).toBe(10);
    expect(decimalToMinor('12')).toBe(1200);
  });

  it('refuses fractions of a kobo, negatives and junk', () => {
    expect(() => minorToDecimal(1.5)).toThrow(RangeError);
    expect(() => minorToDecimal(-1)).toThrow(RangeError);
    expect(() => decimalToMinor('1.234')).toThrow(RangeError);
    expect(() => decimalToMinor('-5.00')).toThrow(RangeError);
    expect(() => decimalToMinor('abc')).toThrow(RangeError);
  });
});
