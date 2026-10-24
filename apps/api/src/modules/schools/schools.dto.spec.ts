import { createSchoolBody, slug } from './schools.dto.js';

describe('school sign-up rules', () => {
  it('accepts plain addresses and lower-cases them', () => {
    expect(slug.parse('Greenfield')).toBe('greenfield');
    expect(slug.parse('st-marys-2')).toBe('st-marys-2');
  });

  it('rejects short, badly formed and reserved addresses', () => {
    for (const bad of [
      'ab',
      '-abc',
      'abc-',
      'a b c',
      'école',
      'x'.repeat(41),
      'www',
      'api',
      'dopple',
    ]) {
      expect(slug.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('needs a 10-character password and a valid colour', () => {
    const body = {
      name: 'Greenfield College',
      slug: 'greenfield',
      adminName: 'Ada',
      adminEmail: 'ada@example.test',
      password: 'long-enough-1',
    };
    expect(
      createSchoolBody.parse({ ...body, brandColor: '#2F7A55' }).brandColor,
    ).toBe('#2f7a55');
    expect(
      createSchoolBody.safeParse({ ...body, password: 'short' }).success,
    ).toBe(false);
    expect(
      createSchoolBody.safeParse({ ...body, brandColor: 'green' }).success,
    ).toBe(false);
  });
});
