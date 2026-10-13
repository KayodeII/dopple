import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AuthService, type Session } from './auth.service.js';
import { Public } from './decorators.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
  wantsCookie,
} from './session-cookie.js';

const signInBody = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(1024),
});

/**
 * Password guessing protection, per client IP. Read on each request so tests and
 * deployments can tune it via LOGIN_RATE_LIMIT_PER_MINUTE without code changes.
 */
const signInLimit = () => Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE ?? 10);

/** Apps send the refresh token in the body; the web app leaves it out and uses the cookie. */
const refreshBody = z
  .object({ refreshToken: z.string().min(1).max(256).optional() })
  .default({});

/** Sign-in for the school at the request host. Accounts never cross schools. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: signInLimit, ttl: 60_000 } })
  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body(new ZodPipe(signInBody)) body: z.infer<typeof signInBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.signIn(body.email, body.password);
    return this.deliver(session, req, res);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: () => signInLimit() * 3, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodPipe(refreshBody)) body: z.infer<typeof refreshBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.refreshToken(body, req);
    try {
      if (!token) throw new UnauthorizedException('Sign in again');
      return this.deliver(await this.auth.refresh(token), req, res);
    } catch (error) {
      // A dead cookie would otherwise be sent, and refused, on every page load.
      if (wantsCookie(req)) clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @Body(new ZodPipe(refreshBody)) body: z.infer<typeof refreshBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.refreshToken(body, req);
    if (token) await this.auth.signOut(token);
    if (wantsCookie(req)) clearRefreshCookie(res);
  }

  @Get('me')
  me() {
    return this.auth.me();
  }

  /** The cookie counts only when the request asks for cookie sessions (see session-cookie.ts). */
  private refreshToken(body: z.infer<typeof refreshBody>, req: Request) {
    return (
      body.refreshToken ??
      (wantsCookie(req) ? readRefreshCookie(req) : undefined)
    );
  }

  /** Cookie sessions get the refresh token as a cookie only, never in the body. */
  private deliver(session: Session, req: Request, res: Response) {
    if (!wantsCookie(req)) return session;
    const { refreshToken, ...rest } = session;
    setRefreshCookie(res, refreshToken, this.auth.refreshTtlMs);
    return rest;
  }
}
