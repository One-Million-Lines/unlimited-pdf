import { defineConfig } from '@playwright/test';

/**
 * E2E tests run against the built, unpacked extension in dist/. Chromium loads
 * the extension via --load-extension. Run `npm run build` first (the test also
 * guards for the dist/ folder).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'off',
  },
});
