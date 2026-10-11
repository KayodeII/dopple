import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  entities: { roles: { provider: '' } },
  dbCredentials: {
    // Migrations run as the database owner; the app connects as dopple_app.
    url: process.env.MIGRATION_DATABASE_URL ?? '',
  },
});
