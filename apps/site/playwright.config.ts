import { defineConfig, devices } from '@playwright/test';

/** Smoke tests for the marketing site. Run against a production build: pnpm build && pnpm test:e2e */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.SITE_URL ?? 'http://localhost:3100',
    // Optional: use an already-installed Chromium instead of `playwright install`.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: process.env.SITE_URL
    ? undefined
    : {
        command: 'pnpm start',
        url: 'http://localhost:3100',
        reuseExistingServer: true,
      },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
