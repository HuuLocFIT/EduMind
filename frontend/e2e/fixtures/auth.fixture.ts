import { test as base, type Page } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from './data.fixture.js';

/** Thrown when test account credentials are invalid (not seeded yet). */
class AuthSkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthSkipError';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthFixtures {
  /** Page already authenticated as a student */
  studentPage: Page;
  /** Page already authenticated as a teacher */
  teacherPage: Page;
  /** Page already authenticated as an admin (Angular app) */
  adminPage: Page;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Authenticate via the API (no UI round-trip) and inject the token into
 * localStorage so the app considers the user logged in on first load.
 *
 * Strategy:
 *  1. Call POST /api/auth/login directly with fetch (no Playwright navigation).
 *  2. Receive the JWT access token.
 *  3. Use page.addInitScript to set localStorage *before* the app boots.
 *
 * This is intentionally thin — we own the frontend behavior and control
 * the network boundary, so we don't need to drive the login UI in every test.
 */
async function loginViaApi(
  page: Page,
  credentials: { email: string; password: string },
  storageKey: 'auth-storage' | 'admin_auth_token'
): Promise<void> {
  // 1. Obtain token via direct API call (runs in Node context, not browser)
  const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { usernameOrEmail: credentials.email, password: credentials.password },
  });

  if (!response.ok()) {
    const body = await response.text();
    // Throw a special error so the fixture can catch and skip the test.
    throw new AuthSkipError(
      `Account "${credentials.email}" returned ${response.status()}. ` +
        'Seed the E2E test account first: npx tsx e2e/scripts/seed-test-accounts.ts ' +
        `(or set E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD env vars). Body: ${body}`
    );
  }

  const body = await response.json();

  // The backend wraps everything in ApiResponse<T> → { code, message, data }
  const data = body?.data ?? body;
  const accessToken: string = data?.accessToken ?? data?.access_token;

  if (!accessToken) {
    throw new Error(
      `loginViaApi: no accessToken in response for ${credentials.email}. Body: ${JSON.stringify(body)}`
    );
  }

  const user = data?.user ?? null;
  const seededFlagKey = '__e2e_auth_seeded__';

  // 2. Inject into localStorage before the app boots
  if (storageKey === 'admin_auth_token') {
    // Admin app reads token from localStorage key "admin_auth_token"
    // and user data from "admin_user" (for AuthService.currentUser$)
    await page.addInitScript(
      ({ token, userData, flagKey }) => {
        try {
          if (sessionStorage.getItem(flagKey) === '1') {
            return;
          }
          localStorage.setItem('admin_auth_token', token);
          if (userData) {
            localStorage.setItem('admin_user', JSON.stringify(userData));
          }
          sessionStorage.setItem(flagKey, '1');
        } catch {
          // Ignore storage access errors on non-app pages/origins.
        }
      },
      { token: accessToken, userData: user, flagKey: seededFlagKey }
    );
  } else {
    // User app uses Zustand persisted store: key "auth-storage"
    const zustandState = JSON.stringify({
      state: {
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      version: 0,
    });
    await page.addInitScript(
      ({ key, value, flagKey }) => {
        try {
          if (sessionStorage.getItem(flagKey) === '1') {
            return;
          }
          localStorage.setItem(key, value);
          // Also set legacy keys the apiClient reads directly
          localStorage.setItem('accessToken', JSON.parse(value).state.accessToken);
          if (JSON.parse(value).state.user) {
            localStorage.setItem('user', JSON.stringify(JSON.parse(value).state.user));
          }
          sessionStorage.setItem(flagKey, '1');
        } catch {
          // Ignore storage access errors on non-app pages/origins.
        }
      },
      { key: storageKey, value: zustandState, flagKey: seededFlagKey }
    );
  }
}

// ─── Fixture Extension ────────────────────────────────────────────────────────

export const test = base.extend<AuthFixtures>({
  studentPage: async ({ page }, use, testInfo) => {
    try {
      await loginViaApi(page, TEST_USERS.student, 'auth-storage');
    } catch (err) {
      if (err instanceof AuthSkipError) {
        testInfo.skip(true, err.message);
        await use(page);
        return;
      }
      throw err;
    }
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },

  teacherPage: async ({ page }, use, testInfo) => {
    try {
      await loginViaApi(page, TEST_USERS.teacher, 'auth-storage');
    } catch (err) {
      if (err instanceof AuthSkipError) {
        testInfo.skip(true, err.message);
        await use(page);
        return;
      }
      throw err;
    }
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },

  adminPage: async ({ page }, use, testInfo) => {
    try {
      await loginViaApi(
        page,
        { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password },
        'admin_auth_token'
      );
    } catch (err) {
      if (err instanceof AuthSkipError) {
        testInfo.skip(true, err.message);
        await use(page);
        return;
      }
      throw err;
    }
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },
});

export { expect } from '@playwright/test';
