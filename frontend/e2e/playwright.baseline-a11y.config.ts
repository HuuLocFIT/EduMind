import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/user',
  testMatch: 'baseline-a11y.spec.ts',
  workers: 1,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env['A11Y_BASE_URL'] || 'http://localhost:3000',
    screenshot: 'off',
    trace: 'off',
  },
  webServer: {
    command: 'npm run start:user',
    url: process.env['A11Y_BASE_URL'] || 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
