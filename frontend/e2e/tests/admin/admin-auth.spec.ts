/**
 * Admin App — Auth Flow E2E Tests
 *
 * Admin auth uses a separate Angular interceptor (auth.interceptor.ts) that
 * reads from localStorage key "admin_auth_token" — different from the user app.
 *
 * Covers:
 *  - Login success → redirects to /dashboard
 *  - Login with wrong password → error message
 *  - Auth guard: unauthenticated access to /dashboard → /auth/login
 *  - Guest guard: authenticated user on /auth/login → /dashboard
 *  - Dashboard renders key stat cards
 *  - Logout → clears token, redirects to /auth/login
 *  - Page reload keeps admin logged in
 */

import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../page-objects/admin/AdminLoginPage.js';
import { TEST_USERS } from '../../fixtures/data.fixture.js';
import { test as authTest } from '../../fixtures/auth.fixture.js';

// ─── Guest / Unauthenticated ──────────────────────────────────────────────────

test.describe('Admin Auth — unauthenticated', () => {
  test('auth guard: /dashboard redirects to /auth/login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('auth guard: /categories redirects to /auth/login', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForURL(/\/auth\/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('login page renders all form elements', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();

    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('wrong password shows error message', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();

    await loginPage.login(TEST_USERS.admin.email, 'WrongPassword!99');
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Login via UI ─────────────────────────────────────────────────────────────

test.describe('Admin Auth — login via UI', () => {
  test('login success → redirects to /dashboard', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithRetryOnTransientError(
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );

    expect(page.url()).toContain('/dashboard');
  });
});

// ─── Authenticated session ────────────────────────────────────────────────────

authTest.describe('Admin Auth — authenticated session', () => {
  authTest('dashboard loads with stats cards', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await adminPage.waitForURL(/\/dashboard/, { timeout: 8_000 });

    // The admin dashboard shows stat cards — at least one should be visible
    const statCard = adminPage
      .locator('[data-testid="stat-card"]')
      .or(adminPage.locator('.stat-card, .card').first());
    await expect(statCard).toBeVisible({ timeout: 8_000 });
  });

  authTest('page reload keeps admin logged in', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await adminPage.reload();
    await adminPage.waitForURL(/\/dashboard/, { timeout: 8_000 });
    expect(adminPage.url()).toContain('/dashboard');
  });

  authTest(
    'guest guard: authenticated admin on /auth/login redirects to /dashboard',
    async ({ adminPage }) => {
      await adminPage.goto('/auth/login');
      await adminPage.waitForURL(/\/dashboard/, { timeout: 8_000 });
      expect(adminPage.url()).toContain('/dashboard');
    }
  );

  authTest('logout clears token and redirects to /auth/login', async ({
    adminPage,
  }) => {
    await adminPage.goto('/dashboard');

    // Find logout button — may be inside a dropdown
    const profileMenu = adminPage
      .getByRole('button', { name: /profile|account|admin|avatar/i })
      .or(adminPage.locator('[data-testid="user-menu"]'));

    if (await profileMenu.count()) {
      await profileMenu.click();
    }

    const logoutButton = adminPage.getByRole('button', { name: /logout|sign out/i }).or(
      adminPage.getByRole('menuitem', { name: /logout|sign out/i })
    );
    await logoutButton.click();

    await adminPage.waitForURL(/\/auth\/login/, { timeout: 8_000 });
    expect(adminPage.url()).toContain('/auth/login');

    // Token should be gone from localStorage
    const token = await adminPage.evaluate(() =>
      localStorage.getItem('admin_auth_token')
    );
    expect(token).toBeNull();
  });
});
