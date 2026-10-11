import { parseHost } from './parse-host.js';

describe('parseHost', () => {
  const platform = 'dopple.school';

  it('reads the school slug from a platform subdomain', () => {
    expect(parseHost('greenfield.dopple.school', platform)).toEqual({
      kind: 'subdomain',
      slug: 'greenfield',
    });
  });

  it('ignores the port and letter case', () => {
    expect(parseHost('GreenField.Dopple.School:3000', platform)).toEqual({
      kind: 'subdomain',
      slug: 'greenfield',
    });
  });

  it('treats any other host as a custom domain', () => {
    expect(parseHost('learn.greenfield.edu.ng', platform)).toEqual({
      kind: 'custom-domain',
      domain: 'learn.greenfield.edu.ng',
    });
  });

  it.each(['dopple.school', 'www.dopple.school', 'api.dopple.school'])(
    'treats %s as the platform, not a school',
    (host) => {
      expect(parseHost(host, platform)).toEqual({ kind: 'platform' });
    },
  );

  it('rejects nested or malformed subdomains', () => {
    expect(parseHost('a.b.dopple.school', platform)).toEqual({
      kind: 'platform',
    });
    expect(parseHost('-bad.dopple.school', platform)).toEqual({
      kind: 'platform',
    });
  });
});
