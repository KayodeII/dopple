/**
 * How a request's host identifies a school:
 *  - `greenfield.dopple.school`  -> subdomain of the platform domain, slug "greenfield"
 *  - `learn.greenfield.edu.ng`   -> a custom domain the school pointed at Dopple
 *  - `dopple.school` / `www.`    -> the platform itself, no school
 */
export type HostMatch =
  | { kind: 'subdomain'; slug: string }
  | { kind: 'custom-domain'; domain: string }
  | { kind: 'platform' };

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app', 'admin', 'status']);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function parseHost(rawHost: string, platformDomain: string): HostMatch {
  const host = rawHost.trim().toLowerCase().replace(/:\d+$/, '');
  const platform = platformDomain.toLowerCase();

  if (host === platform) return { kind: 'platform' };

  if (host.endsWith(`.${platform}`)) {
    const label = host.slice(0, -(platform.length + 1));
    if (RESERVED_SUBDOMAINS.has(label) || !SLUG_PATTERN.test(label)) {
      return { kind: 'platform' };
    }
    return { kind: 'subdomain', slug: label };
  }

  return { kind: 'custom-domain', domain: host };
}
