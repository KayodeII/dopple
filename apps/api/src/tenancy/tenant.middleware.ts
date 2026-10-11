import {
  Injectable,
  NotFoundException,
  type NestMiddleware,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { InjectEnv } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import {
  tenantRequests,
  unknownHostRequests,
} from '../observability/metrics.js';
import { parseHost } from './parse-host.js';
import { TENANT_KEY } from './tenant.js';
import { TenantRegistry } from './tenant-registry.service.js';

/**
 * Resolves the school from the request host and stores it in request context.
 * Every route except /health runs through this; requests for unknown hosts get 404.
 * The tenant is also attached to the active trace span, so traces can be filtered by school.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly registry: TenantRegistry,
    private readonly cls: ClsService,
    @InjectEnv() private readonly env: Env,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.get('x-forwarded-host') ?? req.get('host') ?? '';
    const tenant = await this.registry.resolve(
      parseHost(host, this.env.PLATFORM_DOMAIN),
    );

    if (!tenant) {
      unknownHostRequests.add(1);
      throw new NotFoundException('No school is registered at this address');
    }

    this.cls.set(TENANT_KEY, tenant);
    trace.getActiveSpan()?.setAttributes({
      'tenant.id': tenant.id,
      'tenant.slug': tenant.slug,
    });
    tenantRequests.add(1, { 'tenant.slug': tenant.slug });
    next();
  }
}
