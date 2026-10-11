import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { ShowcaseModule } from './modules/showcase/showcase.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { LoggerModule } from './observability/logger.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [
    // Platform: order matters. Request context must exist before tenancy runs.
    ConfigModule,
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    LoggerModule,
    DatabaseModule,
    TenancyModule,
    HealthModule,

    // Features (one folder per module under src/modules)
    AuthModule, // global guard: every route needs a token unless @Public()
    StudentsModule,
    ShowcaseModule, // platform-level: excluded from TenantMiddleware
  ],
})
export class AppModule {}
