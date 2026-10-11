import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import type { UserRole } from '../../database/schema.js';
import { TENANT_KEY, type Tenant } from '../../tenancy/tenant.js';
import { IS_PUBLIC, ROLES } from './decorators.js';
import { PRINCIPAL_KEY } from './principal.js';
import { TokenService } from './token.service.js';

/**
 * Registered globally, so a new route is private by default.
 * A token is only accepted on the school that issued it: a valid token from
 * one school is rejected on another school's host.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets))
      return true;

    const header =
      context.switchToHttp().getRequest<Request>().get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    const principal =
      scheme?.toLowerCase() === 'bearer' && token
        ? await this.tokens.verify(token)
        : null;
    const tenant = this.cls.get<Tenant | undefined>(TENANT_KEY);
    if (!principal || !tenant || principal.tenantId !== tenant.id) {
      throw new UnauthorizedException();
    }

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES,
      targets,
    );
    if (roles && !roles.includes(principal.role))
      throw new ForbiddenException();

    this.cls.set(PRINCIPAL_KEY, principal);
    return true;
  }
}
