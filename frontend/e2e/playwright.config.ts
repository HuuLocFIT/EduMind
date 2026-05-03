import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFilePath = resolve(process.cwd(), '.env.e2e');
if (existsSync(envFilePath)) {
  (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.(envFilePath);
}

/**
 * Playwright E2E Configuration
 *
 * Covers both the React User App (port 3000) and Angular Admin App (port 4200).
 * Each project points to its own baseURL; tests are matched by directory.
 */
export default defineConfig({
  // Global test directory
  testDir: './tests',

  // Retry flaky tests in CI only
  retries: process.env['CI'] ? 2 : 0,

  // Run tests in parallel (serial in CI to avoid race conditions on shared DB)
  workers: process.env['CI'] ? 1 : undefined,

  // Artifacts on failure / first retry
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  // HTML report for local; GitHub annotations in CI
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ...(process.env['CI'] ? [['github'] as ['github']] : []),
  ],

  // Seed read-only data once before all tests
  globalSetup: './global-setup.ts',

  projects: [
    {
      name: 'user-app',
      testMatch: 'tests/user/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'admin-app',
      testMatch: 'tests/admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4200',
      },
    },
  ],

  // Spin up dev servers when not already running
  webServer: [
    {
      command: 'npm run start:user',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run start:admin',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
