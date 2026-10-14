import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the running API and the seeded demo school
 * (pnpm db:migrate && pnpm db:seed). They sign in a handful of times, under the
 * API's default limit of 10 sign-ins a minute. Locally they reuse `pnpm dev` if it
 * is running; otherwise they serve the last build: pnpm build && pnpm test:e2e.
 * Point the proxy at the API with DOPPLE_API_URL (default http://localhost:3000).
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    // Chromium resolves *.localhost itself, so no hosts-file entry is needed.
    baseURL: process.env.WEB_URL ?? 'http://greenfield.dopple.localhost:3200',
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: process.env.WEB_URL
    ? undefined
    : {
        command: 'pnpm preview',
        url: 'http://localhost:3200',
        reuseExistingServer: true,
      },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
