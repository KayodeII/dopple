import { Module } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { TENANT_KEY, type Tenant } from '../tenancy/tenant.js';

/**
 * Structured JSON logs (pretty-printed in development).
 * OpenTelemetry's pino instrumentation adds trace_id and span_id to every line,
 * and each request log carries the tenant, so logs, traces and schools line up.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          transport:
            env.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          autoLogging: {
            ignore: (req) => req.url?.startsWith('/health') ?? false,
          },
          customProps: () => {
            const tenant = ClsServiceManager.getClsService().get<
              Tenant | undefined
            >(TENANT_KEY);
            return tenant
              ? { tenantId: tenant.id, tenantSlug: tenant.slug }
              : {};
          },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
