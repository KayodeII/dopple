import { describe, expect, it } from 'vitest';
import { changedFields, showValue } from './record';

describe('changedFields', () => {
  it('keeps only what differs, treating missing as blank', () => {
    expect(
      changedFields(
        { lga: 'Ikeja', middleName: null, genotype: 'AS' },
        { lga: 'Ikorodu', middleName: null, genotype: 'AS', allergies: null },
      ),
    ).toEqual({ lga: 'Ikorodu' });
  });
});

describe('showValue', () => {
  it('reads stored values as the form shows them', () => {
    expect(showValue('sex', 'female')).toBe('Female');
    expect(showValue('religion', 'islam')).toBe('Islam');
    expect(showValue('dateOfBirth', '2014-03-09')).toBe('9 March 2014');
    expect(showValue('lga', null)).toBe('Not given');
  });
});
