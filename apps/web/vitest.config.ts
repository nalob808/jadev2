import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // e2e/ belongs to Playwright, which has its own runner and its own
    // `test` export. Without this, vitest collects those specs and fails on
    // an API it does not implement.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
