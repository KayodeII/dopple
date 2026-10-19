import { describe, expect, it } from 'vitest';
import {
  contrast,
  GROUND_DARK,
  GROUND_LIGHT,
  INK,
  textOn,
  WHITE,
} from './color';

describe('school colours', () => {
  it('measures contrast like WCAG', () => {
    expect(contrast(WHITE, '#000000')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('puts white text on dark colours and dark text on light ones', () => {
    expect(textOn('#2f7a55')).toBe(WHITE);
    expect(textOn('#1a237e')).toBe(WHITE);
    expect(textOn('#f5b400')).toBe(INK);
    expect(textOn('#ffffff')).toBe(INK);
  });

  it('can tell when a colour disappears into the dark background', () => {
    expect(contrast('#111111', GROUND_DARK)).toBeLessThan(3);
    expect(contrast('#2f7a55', GROUND_DARK)).toBeGreaterThan(3);
  });

  it('can tell when a colour disappears into the light background', () => {
    expect(contrast('#f0ede6', GROUND_LIGHT)).toBeLessThan(1.6);
    expect(contrast('#2f7a55', GROUND_LIGHT)).toBeGreaterThan(3);
  });
});
