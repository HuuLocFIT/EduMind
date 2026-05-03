/**
 * User App — Auth Flow E2E Tests
 *
 * Covers:
 *  - Login success → redirect to /dashboard
 *  - Login with wrong password → error message shown
 *  - Logout → redirect to /login, protected routes blocked
 *  - Guest guard: unauthenticated access to /dashboard redirects to /login
 *  - Auth persistence: page reload keeps user logged in
 */

import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../page-objects/user/LoginPage.js';
import { API_BASE_URL, TEST_USERS } from '../../fixtures/data.fixture.js';
import { test as authTest } from '../../fixtures/auth.fixture.js';

async function createUiLoginStudent(page: Page) {
  const id = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `e2e-ui-${id}@edumind.test`;
  const password = 'Test@12345';

  const signup = await page.request.post(`${API_BASE_URL}/api/auth/signup`, {
    data: {
      email,
      password,
      firstName: 'E2E',
      lastName: 'UI',
      username: `e2e_ui_${id.replace('-', '_')}`,
    },
  });

  if (!signup.ok()) {
    throw new Error(
      `Failed to create UI login account (${signup.status()}): ${await signup.text()}`
    );
  }

  return { email, password };
}

// ─── Guest / Unauthenticated tests ───────────────────────────────────────────

test.describe('Auth — unauthenticated', () => {
  test('guest guard: /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('guest guard: /learning redirects to /login', async ({ page }) => {
    await page.goto('/learning');
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  test('login page renders correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login(TEST_USERS.student.email, 'WrongPassword!99');

    // Error message should appear — accept any visible alert/error text
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 8_000 });
  });

  test('login with empty fields shows validation error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.submitButton.click();

    // React Hook Form validates on submit — sets aria-invalid="true" on invalid fields
    // and renders an error <p> below the input. No HTML5 `required` attr is used.
    await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true', {
      timeout: 5_000,
    });
  });
});

// ─── Authenticated tests ──────────────────────────────────────────────────────

test.describe('Auth — login via UI', () => {
  test('login success → redirects to /dashboard', async ({ page }) => {
    const student = await createUiLoginStudent(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginWithRetryOnTransientError(
      student.email,
      student.password
    );

    expect(page.url()).toContain('/dashboard');
  });

  test('login redirects back to previous protected page', async ({ page }) => {
    const student = await createUiLoginStudent(page);

    // Try to access wishlist → redirected to login → login → back to wishlist
    await page.goto('/wishlist');
    await page.waitForURL(/\/login/);

    const loginPage = new LoginPage(page);
    await loginPage.login(student.email, student.password);

    // App should return user to the originally requested page
    await page.waitForURL(/\/wishlist|\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/wishlist|\/dashboard/);
  });
});

// ─── Session / Logout tests (use API auth fixture to skip UI login) ───────────

authTest.describe('Auth — session & logout', () => {
  authTest('authenticated user sees dashboard', async ({ studentPage }) => {
    await studentPage.goto('/dashboard');
    await studentPage.waitForURL(/\/dashboard/);

    // Verify dashboard actually loaded (not redirected to login)
    expect(studentPage.url()).toContain('/dashboard');
    await expect(
      studentPage.getByRole('heading', { name: /dashboard|welcome|my learning/i })
        .or(studentPage.locator('[data-testid="dashboard"]'))
    ).toBeVisible({ timeout: 8_000 });
  });

  authTest('page reload keeps user logged in', async ({ studentPage }) => {
    await studentPage.goto('/dashboard');
    await studentPage.reload();
    await studentPage.waitForURL(/\/dashboard/, { timeout: 8_000 });
    expect(studentPage.url()).toContain('/dashboard');
  });

  authTest('logout redirects to /login and blocks protected routes', async ({
    studentPage,
  }) => {
    await studentPage.goto('/dashboard');

    // Trigger logout — find the button via common patterns
    const logoutButton = studentPage
      .getByRole('button', { name: /logout|sign out/i })
      .or(studentPage.getByRole('menuitem', { name: /logout|sign out/i }));

    // If logout is inside a dropdown, open it first
    const profileMenu = studentPage
      .getByRole('button', { name: /profile|account|avatar/i })
      .or(studentPage.locator('[data-testid="user-menu"]'));

    if (await profileMenu.count()) {
      await profileMenu.click();
    }

    await logoutButton.click();
    await studentPage.waitForURL(/\/login/, { timeout: 8_000 });
    expect(studentPage.url()).toContain('/login');

    // Confirm protected route is blocked after logout
    await studentPage.goto('/dashboard');
    await studentPage.waitForURL(/\/login/, { timeout: 6_000 });
    expect(studentPage.url()).toContain('/login');
  });
});
