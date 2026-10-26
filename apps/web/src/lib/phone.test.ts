import { describe, expect, it } from 'vitest';
import { formatPhone } from './phone';

describe('formatPhone', () => {
  it('writes Nigerian numbers the local way', () => {
    expect(formatPhone('+2348031234567')).toBe('0803 123 4567');
  });

  it('leaves other numbers alone', () => {
    expect(formatPhone('+442079460958')).toBe('+442079460958');
  });
});
