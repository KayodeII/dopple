import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { DatabaseErrorFilter } from './common/database-error.filter.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { LearnModule } from './modules/learn/learn.module.js';
import { SchoolModule } from './modules/school/school.module.js';
import { SchoolsModule } from './modules/schools/schools.module.js';
import { ShowcaseModule } from './modules/showcase/showcase.module.js';
import { AcademicSessionsModule } from './modules/academic-sessions/academic-sessions.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { SubjectsModule } from './modules/subjects/subjects.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
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
    AcademicSessionsModule,
    SubjectsModule,
    ClassesModule,
    TimetableModule,
    SchoolModule,
    PaymentsModule, // fee payments through one provider adapter (ADR 0013)
    SchoolsModule, // platform-level: find and create schools
    ShowcaseModule, // platform-level: excluded from TenantMiddleware
    LearnModule, // platform-level: free lessons (ADR 0011), excluded from TenantMiddleware
  ],
  providers: [{ provide: APP_FILTER, useClass: DatabaseErrorFilter }],
})
export class AppModule {}
