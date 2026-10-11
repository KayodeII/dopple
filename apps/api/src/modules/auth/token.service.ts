import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { calculateJwkThumbprint, exportJWK, jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import type { Principal } from './principal.js';

const ISSUER = 'dopple';
const AUDIENCE = 'dopple';
const ALGORITHM = 'EdDSA';

const claimsSchema = z.object({
  sub: z.string().uuid(),
  tid: z.string().uuid(),
  role: z.enum(['admin', 'teacher', 'student', 'parent']),
});

/**
 * Signs and verifies access tokens. Ed25519, so other services (the realtime
 * gateway) can verify tokens from /.well-known/jwks.json without being able to mint them.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private readonly ttlSeconds: number;
  private readonly kid: Promise<string>;

  constructor(@InjectEnv() env: Env) {
    if (env.JWT_PRIVATE_KEY) {
      // Env files cannot hold multi-line values everywhere, so accept "\n" escapes.
      this.privateKey = createPrivateKey(
        env.JWT_PRIVATE_KEY.replaceAll('\\n', '\n'),
      );
    } else {
      this.privateKey = generateKeyPairSync('ed25519').privateKey;
      if (env.NODE_ENV === 'development') {
        this.logger.warn(
          'JWT_PRIVATE_KEY is not set: using a throwaway signing key',
        );
      }
    }
    this.publicKey = createPublicKey(this.privateKey);
    this.ttlSeconds = env.ACCESS_TOKEN_TTL_SECONDS;
    this.kid = exportJWK(this.publicKey).then((jwk) =>
      calculateJwkThumbprint(jwk),
    );
  }

  get accessTokenTtlSeconds() {
    return this.ttlSeconds;
  }

  async sign(principal: Principal): Promise<string> {
    return new SignJWT({ tid: principal.tenantId, role: principal.role })
      .setProtectedHeader({ alg: ALGORITHM, kid: await this.kid })
      .setSubject(principal.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.ttlSeconds}s`)
      .sign(this.privateKey);
  }

  /** Returns null for any token that is invalid, expired or not ours. */
  async verify(token: string): Promise<Principal | null> {
    try {
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: [ALGORITHM],
      });
      const claims = claimsSchema.parse(payload);
      return { userId: claims.sub, tenantId: claims.tid, role: claims.role };
    } catch {
      return null;
    }
  }

  async jwks() {
    const jwk = await exportJWK(this.publicKey);
    return {
      keys: [{ ...jwk, kid: await this.kid, alg: ALGORITHM, use: 'sig' }],
    };
  }
}
