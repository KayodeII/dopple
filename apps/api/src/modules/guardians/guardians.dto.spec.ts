import { addGuardianBody, normalisePhone } from './guardians.dto.js';

describe('normalisePhone', () => {
  it('reads Nigerian numbers written locally or internationally', () => {
    for (const raw of [
      '08031234567',
      '0803 123 4567',
      '0803-123-4567',
      '2348031234567',
      '+234 803 123 4567',
      '+234 (803) 123.4567',
    ]) {
      expect(normalisePhone(raw), raw).toBe('+2348031234567');
    }
  });

  it('keeps other countries as given', () => {
    expect(normalisePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('refuses what is not a phone number', () => {
    for (const raw of ['', '0803', '0803123456', 'call me', '+0123456789']) {
      expect(normalisePhone(raw), raw).toBeNull();
    }
  });
});

describe('addGuardianBody', () => {
  it('takes a new guardian, with the phone normalised and email lower-cased', () => {
    expect(
      addGuardianBody.parse({
        name: 'Funke Adebayo',
        phone: '0803 123 4567',
        email: ' Funke@Example.com ',
        relationship: 'Mother',
      }),
    ).toEqual({
      name: 'Funke Adebayo',
      phone: '+2348031234567',
      email: 'funke@example.com',
      relationship: 'Mother',
    });
  });

  it('takes a guardian already on record by id', () => {
    const guardianId = '5b0c8a4e-6f53-4b8e-9d0a-1c2b3d4e5f60';
    expect(
      addGuardianBody.parse({ guardianId, relationship: 'Father' }),
    ).toEqual({ guardianId, relationship: 'Father' });
  });

  it('needs a relationship and a real phone number', () => {
    expect(
      addGuardianBody.safeParse({ name: 'X', phone: '0803123456' }).success,
    ).toBe(false);
    expect(
      addGuardianBody.safeParse({ name: 'X', phone: '08031234567' }).success,
    ).toBe(false);
  });
});
