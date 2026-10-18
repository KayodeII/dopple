import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenancyModule } from '../../tenancy/tenancy.module.js';
import { SchoolsController } from './schools.controller.js';
import { SchoolsService } from './schools.service.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TenancyModule,
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
