import { schoolOrigin } from './school-url.js';

describe('schoolOrigin', () => {
  it('builds the school address from the platform domain or its own domain', () => {
    const prod = {
      SCHOOL_URL_FORMAT: 'https://{host}',
      PLATFORM_DOMAIN: 'dopple.school',
    };
    expect(schoolOrigin(prod, { slug: 'greenfield' })).toBe(
      'https://greenfield.dopple.school',
    );
    expect(
      schoolOrigin(prod, {
        slug: 'greenfield',
        customDomain: 'learn.greenfield.edu.ng',
      }),
    ).toBe('https://learn.greenfield.edu.ng');
    const local = {
      SCHOOL_URL_FORMAT: 'http://{host}:3200',
      PLATFORM_DOMAIN: 'dopple.localhost',
    };
    expect(schoolOrigin(local, { slug: 'riverside' })).toBe(
      'http://riverside.dopple.localhost:3200',
    );
  });
});
