import { expect, test, type Page, type Route } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

type AuthOutcome = 'success' | 'error' | '2fa';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

async function installAuthFixtures(
  page: Page,
  outcomes: Partial<Record<'login' | 'signup' | 'forgot' | 'reset', AuthOutcome>> = {},
) {
  await page.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith('/auth/login')) {
      const outcome = outcomes.login ?? 'error';
      if (outcome === '2fa') {
        await json(route, {
          status: 200,
          success: true,
          data: {
            requires2FA: true,
            email: 'student@example.test',
            message: 'Two-factor authentication required',
          },
        });
        return;
      }
      if (outcome === 'success') {
        await json(route, {
          status: 200,
          success: true,
          data: {
            accessToken: 'deterministic-access-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
              id: 101,
              username: 'a11y_student',
              email: 'student@example.test',
              roles: ['STUDENT'],
            },
          },
        });
        return;
      }
      await json(route, {
        status: 401,
        success: false,
        message: 'Invalid email or password',
      }, 401);
      return;
    }

    if (pathname.endsWith('/auth/signup')) {
      if (outcomes.signup === 'success') {
        await json(route, {
          status: 201,
          success: true,
          message: 'Account created. Check your email to verify it.',
        }, 201);
      } else {
        await json(route, {
          status: 409,
          success: false,
          message: 'An account with this email already exists',
        }, 409);
      }
      return;
    }

    if (pathname.endsWith('/auth/password/forgot')) {
      if (outcomes.forgot === 'success') {
        await json(route, {
          status: 200,
          success: true,
          message: 'If the address is registered, reset instructions have been sent.',
        });
      } else {
        await json(route, {
          status: 503,
          success: false,
          message: 'Reset service is temporarily unavailable',
        }, 503);
      }
      return;
    }

    if (pathname.endsWith('/auth/password/reset')) {
      if (outcomes.reset === 'success') {
        await json(route, {
          status: 200,
          success: true,
          message: 'Password reset successfully',
        });
      } else {
        await json(route, {
          status: 400,
          success: false,
          message: 'This reset link has expired',
        }, 400);
      }
      return;
    }

    await json(route, { status: 404, success: false, message: 'Unknown auth fixture' }, 404);
  });
}

test.describe('@a11y @a11y-auth Flow 2: authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('login exposes labels, password state, validation focus, API error, and 2FA', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { login: '2fa' });
    await page.goto('/login');

    const heading = page.getByRole('heading', { level: 1, name: 'Sign In' });
    await expect(heading).toBeFocused();
    await expect(page.getByLabel('Username or Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    await checkA11y(page, { stateName: 'auth login default', testInfo });

    const password = page.getByLabel('Password', { exact: true });
    const toggle = page.getByRole('button', { name: 'Show password' });
    await password.fill('Password123');
    await toggle.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('Password123');
    await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByLabel('Username or Email').fill('student@example.test');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Two-Factor Authentication' })).toBeFocused();
    const code = page.getByLabel('Verification Code');
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(code).toHaveAccessibleDescription(/6-digit/i);
    await checkA11y(page, { stateName: 'auth login 2fa challenge', testInfo });

    await page.getByRole('button', { name: /verify/i }).click();
    await expect(code).toHaveAttribute('aria-invalid', 'true');
    await expect(code).toBeFocused();
    await checkA11y(page, { stateName: 'auth login 2fa validation error', testInfo });
  });

  test('login server error is announced once and keeps a recovery focus target', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { login: 'error' });
    await page.goto('/login');
    await page.getByLabel('Username or Email').fill('student@example.test');
    await page.getByLabel('Password', { exact: true }).fill('WrongPassword123');
    await page.getByRole('button', { name: 'Sign In' }).press('Enter');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText(/invalid email or password/i);
    await expect(alert).toBeFocused();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await checkA11y(page, { stateName: 'auth login server error', testInfo });
  });

  test('signup associates requirements and errors, then announces success', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { signup: 'success' });
    await page.goto('/signup');

    await expect(page.getByRole('heading', { level: 1, name: 'Create Account' })).toBeFocused();
    const username = page.getByLabel(/Username/);
    const email = page.getByLabel(/^Email/);
    const password = page.getByLabel(/^Password/);
    await expect(username).toHaveAttribute('autocomplete', 'username');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(password).toHaveAttribute('autocomplete', 'new-password');
    await expect(password).toHaveAccessibleDescription(/at least|uppercase|lowercase|number/i);
    await checkA11y(page, { stateName: 'auth signup default', testInfo });

    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(username).toHaveAttribute('aria-invalid', 'true');
    await expect(username).toBeFocused();
    await checkA11y(page, { stateName: 'auth signup validation errors', testInfo });

    await username.fill('a11y_student');
    await email.fill('student@example.test');
    await password.fill('Accessible123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    const successHeading = page.getByRole('heading', { level: 1, name: /account created/i });
    await expect(successHeading).toBeFocused();
    await expect(successHeading).toHaveAccessibleDescription(/check your email.*before signing in/i);
    await expect(page.getByRole('link', { name: 'Go to Sign In' })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth signup success', testInfo });
  });

  test('forgot-password covers validation, success, resend, and back link', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { forgot: 'success' });
    await page.goto('/forgot-password');
    const email = page.getByLabel('Email Address');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await checkA11y(page, { stateName: 'auth forgot password default', testInfo });

    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();
    await checkA11y(page, { stateName: 'auth forgot password validation error', testInfo });

    await email.fill('student@example.test');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Check Your Email' })).toBeFocused();
    await expect(page.getByRole('status')).toContainText(/reset instructions|check your email/i);
    await expect(page.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth forgot password success', testInfo });

    await page.getByRole('button', { name: 'Resend Email' }).click();
    await expect(page.getByRole('status')).toContainText(/sent again|reset/i);
  });

  test('reset-password covers missing token, validation, API error, and success', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { reset: 'error' });
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { level: 1, name: 'Invalid Reset Link' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Request New Link' })).toHaveAttribute('href', '/forgot-password');
    await checkA11y(page, { stateName: 'auth reset password missing token', testInfo });

    await page.goto('/reset-password?token=expired-fixture');
    const password = page.getByLabel('New Password');
    const confirmation = page.getByLabel('Confirm New Password');
    await expect(password).toHaveAttribute('autocomplete', 'new-password');
    await expect(confirmation).toHaveAttribute('autocomplete', 'new-password');
    await expect(password).toHaveAccessibleDescription(/at least 8|uppercase|lowercase|number/i);
    await checkA11y(page, { stateName: 'auth reset password valid token default', testInfo });

    await password.fill('short');
    await confirmation.fill('different');
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toBeFocused();
    await checkA11y(page, { stateName: 'auth reset password validation errors', testInfo });

    await password.fill('Accessible123');
    await confirmation.fill('Accessible123');
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(page.getByRole('alert')).toContainText(/expired/i);
    await expect(page.getByRole('alert')).toBeFocused();
    await checkA11y(page, { stateName: 'auth reset password API error', testInfo });
  });

  test('reset-password success is announced and offers an explicit login link', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { reset: 'success' });
    await page.goto('/reset-password?token=valid-fixture');
    await page.getByLabel('New Password').fill('Accessible123');
    await page.getByLabel('Confirm New Password').fill('Accessible123');
    await page.getByRole('button', { name: 'Reset Password' }).click();

    await expect(page.getByRole('heading', { level: 1, name: /password reset/i })).toBeFocused();
    await expect(page.getByRole('status')).toContainText(/password.*reset successfully/i);
    await expect(page.getByRole('link', { name: /sign in|login/i })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth reset password success', testInfo });
  });
});
