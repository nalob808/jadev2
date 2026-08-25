import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests need a database. They skip when TEST_DATABASE_URL is unset
 * so `pnpm test` stays green anywhere, and run for real in CI.
 *
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @jade/web e2e
 */
const port = 3199;

export default defineConfig({
  testDir: './e2e',
  /**
   * The person page now composes a reading, seats twelve houses and renders an
   * interactive wheel on top of casting the chart, and several tests create a
   * person each. Sixty seconds was comfortable before that and became a
   * source of failures that pass in isolation — which is the worst kind,
   * because it teaches you to re-run rather than to look.
   */
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    // Escape hatch for sandboxes that already have a Chromium and cannot run
    // `npx playwright install`. Unset everywhere else.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: process.env.TEST_DATABASE_URL
    ? {
        command: `next dev -p ${port}`,
        url: `http://127.0.0.1:${port}/sign-in`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.TEST_DATABASE_URL,
          DIRECT_DATABASE_URL: process.env.TEST_DATABASE_URL,
          AUTH_MODE: 'dev',
          NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        },
      }
    : undefined,
});
