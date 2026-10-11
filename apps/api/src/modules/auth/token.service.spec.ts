import { loadEnv } from '../../config/env.js';
import { TokenService } from './token.service.js';

const env = loadEnv({
  DATABASE_URL: 'postgres://u:p@localhost/db',
  NODE_ENV: 'test',
});
const principal = {
  userId: '6b219c23-8fe8-4f9e-9ff9-9ddb371d838d',
  tenantId: '49bddcd0-0962-4e3b-8b89-67beadadf2f9',
  role: 'teacher',
} as const;

describe('TokenService', () => {
  it('verifies the tokens it signs', async () => {
    const tokens = new TokenService(env);
    expect(await tokens.verify(await tokens.sign(principal))).toEqual(
      principal,
    );
  });

  it('rejects tokens signed with another key', async () => {
    const token = await new TokenService(env).sign(principal);
    expect(await new TokenService(env).verify(token)).toBeNull();
  });

  it('rejects tampered and expired tokens', async () => {
    const tokens = new TokenService(env);
    const [header, , signature] = (await tokens.sign(principal)).split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...principal, role: 'admin' }),
    ).toString('base64url');
    expect(await tokens.verify(`${header}.${forged}.${signature}`)).toBeNull();

    const shortLived = new TokenService({
      ...env,
      ACCESS_TOKEN_TTL_SECONDS: 1,
    });
    vi.useFakeTimers({ now: Date.now() - 60_000 });
    const old = await shortLived.sign(principal);
    vi.useRealTimers();
    expect(await shortLived.verify(old)).toBeNull();
  });

  it('refuses to boot in production without a key', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://u:p@localhost/db',
        NODE_ENV: 'production',
      }),
    ).toThrow(/JWT_PRIVATE_KEY/);
  });
});
