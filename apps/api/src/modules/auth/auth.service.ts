import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt, isNotNull, isNull } from 'drizzle-orm';
import { ClsService } from 'nestjs-cls';
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import { refreshTokens, users, type User } from '../../database/schema.js';
import {
  TenantDb,
  type Transaction,
} from '../../database/tenant-db.service.js';
import { refreshTokenReuse, signIns } from '../../observability/metrics.js';
import { hashPassword, verifyPassword } from './password.js';
import { PRINCIPAL_KEY, type Principal } from './principal.js';
import { TokenService } from './token.service.js';

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

export interface Session {
  tokenType: 'Bearer';
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  refreshToken: string;
  user: PublicUser;
}

const publicUser = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('base64url');

// Checked against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;

@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly tokens: TokenService,
    private readonly cls: ClsService,
    @InjectEnv() env: Env,
  ) {
    this.refreshTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const [user] = await this.tenantDb.run((tx) =>
      tx
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1),
    );
    // Verified outside the transaction: scrypt is slow and should not hold a pooled connection.
    const valid = await verifyPassword(
      password,
      user?.passwordHash ??
        (await (dummyHash ??= hashPassword(randomBytes(16).toString('hex')))),
    );
    const ok = valid && user?.status === 'active';
    signIns.add(1, { outcome: ok ? 'success' : 'failure' });
    if (!ok) throw new UnauthorizedException('Email or password is incorrect');

    return this.tenantDb.run((tx) => this.startSession(tx, user));
  }

  /**
   * Swaps a refresh token for a new pair. Each refresh token works once; seeing a
   * used one again means someone else holds a copy, so every session of that user ends.
   */
  async refresh(refreshToken: string): Promise<Session> {
    const tokenHash = sha256(refreshToken);
    const now = new Date();

    const result = await this.tenantDb.run(async (tx) => {
      const [current] = await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, now),
          ),
        )
        .returning({ userId: refreshTokens.userId });

      if (!current) {
        const [reused] = await tx
          .select({ userId: refreshTokens.userId })
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.tokenHash, tokenHash),
              isNotNull(refreshTokens.revokedAt),
            ),
          );
        if (reused) {
          await tx
            .update(refreshTokens)
            .set({ revokedAt: now })
            .where(
              and(
                eq(refreshTokens.userId, reused.userId),
                isNull(refreshTokens.revokedAt),
              ),
            );
          refreshTokenReuse.add(1);
        }
        return null;
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, current.userId), eq(users.status, 'active')));
      return user ? this.startSession(tx, user) : null;
    });

    if (!result) throw new UnauthorizedException('Sign in again');
    return result;
  }

  /** Deleted rather than revoked, so signing out never looks like token reuse. */
  async signOut(refreshToken: string): Promise<void> {
    await this.tenantDb.run((tx) =>
      tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256(refreshToken))),
    );
  }

  async me(): Promise<PublicUser> {
    const principal = this.cls.get<Principal>(PRINCIPAL_KEY);
    const [user] = await this.tenantDb.run((tx) =>
      tx
        .select(publicUser)
        .from(users)
        .where(and(eq(users.id, principal.userId), eq(users.status, 'active'))),
    );
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async startSession(tx: Transaction, user: User): Promise<Session> {
    const refreshToken = randomBytes(32).toString('base64url');
    await tx.insert(refreshTokens).values({
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
    const accessToken = await this.tokens.sign({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: this.tokens.accessTokenTtlSeconds,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
