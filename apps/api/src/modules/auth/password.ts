import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Passwords are hashed with scrypt from node:crypto: memory-hard, no native
 * build step. The cost parameters are stored in the hash, so they can be raised
 * later without breaking existing passwords.
 *
 * Format: scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>. scripts/seed.mjs writes the same format.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      // scrypt needs 128 * N * r bytes; Node's default cap is 32 MiB.
      { N: n, r, p, maxmem: 256 * n * r },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64'),
    Number(n),
    Number(r),
    Number(p),
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
