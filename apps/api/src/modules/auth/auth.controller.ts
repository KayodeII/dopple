import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators.js';

const signInBody = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(1024),
});

/**
 * Password guessing protection, per client IP. Read on each request so tests and
 * deployments can tune it via LOGIN_RATE_LIMIT_PER_MINUTE without code changes.
 */
const signInLimit = () => Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE ?? 10);

const refreshBody = z.object({ refreshToken: z.string().min(1).max(256) });

/** Sign-in for the school at the request host. Accounts never cross schools. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: signInLimit, ttl: 60_000 } })
  @Post('sign-in')
  @HttpCode(200)
  signIn(@Body(new ZodPipe(signInBody)) body: z.infer<typeof signInBody>) {
    return this.auth.signIn(body.email, body.password);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: () => signInLimit() * 3, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodPipe(refreshBody)) body: z.infer<typeof refreshBody>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Public()
  @Post('sign-out')
  @HttpCode(204)
  signOut(@Body(new ZodPipe(refreshBody)) body: z.infer<typeof refreshBody>) {
    return this.auth.signOut(body.refreshToken);
  }

  @Get('me')
  me() {
    return this.auth.me();
  }
}
