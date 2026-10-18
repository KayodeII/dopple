import {
  Module,
  RequestMethod,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware.js';
import { TenantRegistry } from './tenant-registry.service.js';

@Module({
  providers: [TenantRegistry, TenantMiddleware],
  exports: [TenantRegistry],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/{*rest}', method: RequestMethod.ALL },
        // Platform-level public routes (served on dopple.school itself, no school host).
        { path: 'showcase/{*rest}', method: RequestMethod.ALL },
        { path: '.well-known/{*rest}', method: RequestMethod.ALL },
        // Finding and creating schools happens on the platform host (ADR 0010).
        { path: 'schools', method: RequestMethod.ALL },
        { path: 'schools/{*rest}', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '{*rest}', method: RequestMethod.ALL });
  }
}
