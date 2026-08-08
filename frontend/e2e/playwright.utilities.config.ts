import { defineConfig, devices } from '@playwright/test';

/**
 * Fast, app-independent checks for the shared E2E accessibility utilities.
 * These fixtures use page.setContent(), so no dev server or database seed is
 * needed. Run with:
 * npx playwright test --config=e2e/playwright.utilities.config.ts
 */
export default defineConfig({
  testDir: './tests/user',
  testMatch: 'accessibility-utils.spec.ts',
  fullyParallel: true,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
});
