import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type pg from 'pg';
import { PG_POOL } from '../database/tokens.js';
import { Public } from '../modules/auth/decorators.js';

/**
 * /health/live  - the process is up (for restarts). Never touches dependencies.
 * /health/ready - dependencies are reachable (for load balancers).
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(PG_POOL) private readonly pool: pg.Pool,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => {
        await this.pool.query('select 1');
        return { database: { status: 'up' } };
      },
    ]);
  }
}
