import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { JwksController } from './jwks.controller.js';
import { TokenService } from './token.service.js';

@Module({
  // Rate limits apply only where a controller opts in with ThrottlerGuard (sign-in, refresh).
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [AuthController, JwksController],
  providers: [
    AuthService,
    TokenService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
