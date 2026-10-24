import {
  createStudentBody,
  healthBody,
  NIGERIAN_STATES,
  updateStudentBody,
} from './students.dto.js';

describe('student DTOs', () => {
  it('lists the 36 states and the FCT', () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
    expect(new Set(NIGERIAN_STATES).size).toBe(37);
  });

  it('registers with just an admission number and names', () => {
    expect(
      createStudentBody.parse({
        admissionNo: 'GF-9',
        firstName: 'Tolu',
        lastName: 'Ade',
      }),
    ).toEqual({ admissionNo: 'GF-9', firstName: 'Tolu', lastName: 'Ade' });
    expect(
      createStudentBody.safeParse({ admissionNo: 'GF-9', firstName: 'Tolu' })
        .success,
    ).toBe(false);
  });

  it('turns blank optional text into null', () => {
    expect(updateStudentBody.parse({ lga: ' ', homeAddress: '' })).toEqual({
      lga: null,
      homeAddress: null,
    });
  });

  it('refuses a date of birth in the future', () => {
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(updateStudentBody.safeParse({ dateOfBirth: tomorrow }).success).toBe(
      false,
    );
  });

  it('fills a health record left partly blank with nulls', () => {
    expect(healthBody.parse({ genotype: 'AS' })).toEqual({
      bloodGroup: null,
      genotype: 'AS',
      allergies: null,
      conditions: null,
    });
  });
});
