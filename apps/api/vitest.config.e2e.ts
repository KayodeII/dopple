import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// e2e tests boot the real app, so they need the same environment as `pnpm dev`.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Suites sign in many times from one IP; the rate-limit spec sets its own low limit.
    env: {
      LOG_LEVEL: 'warn',
      OTEL_SDK_DISABLED: 'true',
      LOGIN_RATE_LIMIT_PER_MINUTE: '1000',
    },
  },
});
