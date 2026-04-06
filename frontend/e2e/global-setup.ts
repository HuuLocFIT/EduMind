/**
 * Global Setup — runs ONCE before the entire Playwright suite.
 *
 * Responsibilities:
 *  - Verify the backend is reachable (fail fast with a clear message).
 *  - Ensure the E2E test accounts exist. If they don't, we log a warning
 *    rather than crashing — the individual test fixtures will surface a
 *    clearer error when they try to authenticate.
 *
 * NOTE: This file intentionally does NOT create or delete data.
 * Test data creation/cleanup lives in individual test fixtures (beforeAll /
 * afterAll) so each test owns its own state lifecycle.
 */

import { request } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './fixtures/data.fixture.js';

export default async function globalSetup(): Promise<void> {
  const context = await request.newContext({ baseURL: API_BASE_URL });

  // ── 1. Verify backend reachability ──────────────────────────────────────
  try {
    const health = await context.get('/actuator/health', { timeout: 10_000 });
    if (!health.ok()) {
      console.warn(
        `[global-setup] Backend health check returned ${health.status()}. ` +
          'Tests may fail if the API is unavailable.'
      );
    } else {
      console.log('[global-setup] Backend is healthy ✓');
    }
  } catch {
    console.warn(
      '[global-setup] Could not reach backend health endpoint. ' +
        `Make sure the API is running at ${API_BASE_URL}.`
    );
  }

  // ── 2. Smoke-test student credentials ───────────────────────────────────
  const loginCheck = await context
    .post('/api/auth/login', {
      data: {
        usernameOrEmail: TEST_USERS.student.email,
        password: TEST_USERS.student.password,
      },
      timeout: 15_000,
    })
    .catch(() => null);

  if (!loginCheck?.ok()) {
    console.warn(
      `[global-setup] E2E student account "${TEST_USERS.student.email}" ` +
        'does not exist or credentials are wrong. ' +
        'Create it manually or via a seed script before running E2E tests.'
    );
  } else {
    console.log(
      `[global-setup] E2E student account "${TEST_USERS.student.email}" verified ✓`
    );
  }

  await context.dispose();
}
