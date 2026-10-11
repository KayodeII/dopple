import { Controller, Get, Header } from '@nestjs/common';
import { Public } from './decorators.js';
import { TokenService } from './token.service.js';

/** Platform-level: public keys other services use to verify access tokens. */
@Controller('.well-known')
export class JwksController {
  constructor(private readonly tokens: TokenService) {}

  @Public()
  @Get('jwks.json')
  @Header('Cache-Control', 'public, max-age=300')
  jwks() {
    return this.tokens.jwks();
  }
}
