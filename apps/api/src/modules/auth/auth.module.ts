import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { JwksController } from './jwks.controller.js';
import { TokenService } from './token.service.js';

@Module({
  controllers: [AuthController, JwksController],
  providers: [
    AuthService,
    TokenService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
