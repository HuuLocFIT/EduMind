import { expect, test, type Page, type Route } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

type AuthOutcome = 'success' | 'error' | '2fa';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const apiError = (status: number, message: string, path: string) => ({
  status,
  message,
  path,
  timestamp: '2026-01-01T00:00:00.000Z',
});

async function installAuthFixtures(
  page: Page,
  outcomes: Partial<Record<'login' | 'signup' | 'forgot' | 'reset', AuthOutcome>> = {},
) {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (!pathname.includes('/auth/')) {
      // Non-auth API calls (e.g. dashboard/learning data fetched by protected
      // pages) must never reach the real backend with the fixture's fake
      // token: a real 401 there triggers the app's refresh-then-logout flow
      // and bounces the page back to /login, racing with test assertions.
      if (route.request().method() !== 'GET') {
        await json(route, apiError(405, 'Auth fixture blocks state-changing requests', pathname), 405);
        return;
      }
      await json(route, { status: 200, success: true, data: [] });
      return;
    }

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
              isActive: true,
              isEmailVerified: true,
              is2faEnabled: false,
              isTrial: false,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        });
        return;
      }
      await json(route, apiError(401, 'Invalid email or password', pathname), 401);
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
        await json(
          route,
          apiError(409, 'An account with this email already exists', pathname),
          409,
        );
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
        await json(
          route,
          apiError(503, 'Reset service is temporarily unavailable', pathname),
          503,
        );
      }
      return;
    }

    if (pathname.endsWith('/auth/password/validate-token')) {
      // ResetPasswordPage validates the token on mount before showing the
      // form; every fixture token here is treated as valid at check time so
      // the reset outcome itself (below) is what the test actually exercises.
      await json(route, { status: 200, success: true, data: { email: 'student@example.test' } });
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
        await json(route, apiError(400, 'This reset link has expired', pathname), 400);
      }
      return;
    }

    if (pathname.endsWith('/auth/refresh')) {
      // This suite never seeds a refresh-token cookie, so every scenario here is a guest
      // as far as the mandatory boot probe is concerned (AuthBootBoundary ->
      // bootstrapAuthSession). It must fail with errorCode ERR_2004 specifically —
      // anything else is treated as transient and parks authBootStatus at 'retry'
      // forever, which leaves ProtectedRoute stuck on "Checking authentication...".
      await json(
        route,
        { ...apiError(401, 'No refresh token present', pathname), success: false, errorCode: 'ERR_2004' },
        401,
      );
      return;
    }

    await json(route, apiError(404, 'Unknown auth fixture', pathname), 404);
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
    const hidePassword = page.getByRole('button', { name: 'Hide password' });
    await expect(hidePassword).not.toHaveAttribute('aria-pressed');
    await expect(hidePassword).toBeFocused();
    await checkA11y(page, { stateName: 'auth login password revealed', testInfo });

    await hidePassword.click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('Password123');
    await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused();
    await checkA11y(page, { stateName: 'auth login password hidden again', testInfo });

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

  test('login success reaches the authenticated destination', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { login: 'success' });
    await page.goto('/login');
    await checkA11y(page, { stateName: 'auth login success journey ready', testInfo });

    await page.getByLabel('Username or Email').fill('student@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Accessible123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('main')).toBeVisible();
    await checkA11y(page, { stateName: 'auth login authenticated dashboard', testInfo });
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

  test('login validation summary announces only current errors', async ({ page }, testInfo) => {
    await installAuthFixtures(page);
    await page.goto('/login');

    await page.getByRole('button', { name: 'Sign In' }).click();
    const alert = page.getByRole('alert');
    await expect(page.getByLabel('Username or Email')).toBeFocused();
    await expect(alert).toContainText('2 errors');
    await expect(alert).toContainText('Username or email is required');
    await expect(alert).toContainText('Password is required');
    await expect(page.getByRole('alert')).toHaveCount(1);

    await page.getByLabel('Username or Email').fill('student');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
    await expect(alert).toContainText('1 error');
    await expect(alert).not.toContainText('Username or email is required');
    await expect(alert).toContainText('Password is required');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await checkA11y(page, { stateName: 'auth login validation summary', testInfo });
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
    const signupAlert = page.getByRole('alert');
    await expect(username).toBeFocused();
    await expect(signupAlert).toContainText('3 errors');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await checkA11y(page, { stateName: 'auth signup validation errors', testInfo });

    await username.fill('a11y_student');
    await email.fill('student@example.test');
    await password.fill('Accessible123!');
    await checkA11y(page, { stateName: 'auth signup validation errors corrected', testInfo });
    await page.getByRole('button', { name: 'Create Account' }).click();
    const successHeading = page.getByRole('heading', { level: 1, name: /account created/i });
    await expect(successHeading).toBeFocused();
    await expect(successHeading).toHaveAccessibleDescription(/check your email.*before signing in/i);
    await expect(page.getByRole('link', { name: 'Go to Sign In' })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth signup success', testInfo });
  });

  test('forgot-password covers validation, success, resend, and back link', async ({ page }, testInfo) => {
    // Install the fake clock before any navigation/interaction so the
    // 60s resend cooldown (a real `setInterval` started on first success)
    // is tracked by it from the moment it's created. Playwright's clock
    // ticks in step with real time until paused/advanced, so the earlier
    // validation flow (which relies on a real 300ms `setTimeout`) still
    // behaves exactly as before.
    await page.clock.install();
    await installAuthFixtures(page, { forgot: 'success' });
    await page.goto('/forgot-password');
    const email = page.getByLabel('Email Address');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await checkA11y(page, { stateName: 'auth forgot password default', testInfo });

    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    const forgotAlert = page.getByRole('alert');
    await expect(email).toBeFocused();
    await expect(forgotAlert).toContainText('1 error');
    await expect(forgotAlert).toContainText('Invalid email address');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await checkA11y(page, { stateName: 'auth forgot password validation error', testInfo });

    await email.fill('student@example.test');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    const confirmationHeading = page.getByRole('heading', { level: 1, name: 'Check Your Email' });
    await expect(confirmationHeading).toBeFocused();
    // The confirmation detail is exposed via aria-describedby (role="text"),
    // not a role="status" live region — see ForgotPasswordPage.tsx for why
    // VoiceOver needs the description tied to the heading's initial focus
    // instead of a freshly-mounted live region.
    await expect(confirmationHeading).toHaveAccessibleDescription(/reset instructions/i);
    await expect(page.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth forgot password success', testInfo });

    const resendButton = page.getByRole('button', { name: 'Resend Email' });
    await expect(resendButton).toHaveAttribute('aria-disabled', 'true');
    await checkA11y(page, { stateName: 'auth forgot password cooldown', testInfo });

    // Jump the faked clock 60s forward instead of waiting in real time;
    // this fires the cooldown's setInterval ticks synchronously and clears it.
    await page.clock.runFor(60_000);
    await expect(resendButton).not.toHaveAttribute('aria-disabled');
    await expect(resendButton).not.toHaveAttribute('aria-describedby');

    await resendButton.click();
    await expect(
      page.getByRole('main').getByRole('status').filter({ hasText: /sent again/i }),
    ).toBeVisible();
    await checkA11y(page, { stateName: 'auth forgot password resent', testInfo });
  });

  test('forgot-password API error is announced once and can be corrected', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { forgot: 'error' });
    await page.goto('/forgot-password');
    await page.getByLabel('Email Address').fill('student@example.test');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText(/temporarily unavailable/i);
    await expect(alert).toBeFocused();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await checkA11y(page, { stateName: 'auth forgot password API error', testInfo });
  });

  test('reset-password covers missing token, validation, API error, and success', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { reset: 'error' });
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { level: 1, name: 'Invalid Reset Link' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Request New Link' })).toHaveAttribute('href', '/forgot-password');
    await checkA11y(page, { stateName: 'auth reset password missing token', testInfo });

    await page.goto('/reset-password?token=expired-fixture');
    await expect(page).toHaveURL(/\/reset-password\?token=expired-fixture$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Reset Password' })).toBeVisible();
    const password = page.locator('#new-password');
    const confirmation = page.locator('#confirm-new-password');
    await expect(password).toHaveAccessibleName('New Password');
    await expect(confirmation).toHaveAccessibleName('Confirm New Password');
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
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Invalid Reset Link' }),
    ).toBeFocused();
    await checkA11y(page, { stateName: 'auth reset password API error', testInfo });
  });

  test('reset-password success is announced and offers an explicit login link', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { reset: 'success' });
    await page.goto('/reset-password?token=valid-fixture');
    await expect(page.getByRole('heading', { level: 1, name: 'Reset Password' })).toBeVisible();
    await page.locator('#new-password').fill('Accessible123');
    await page.locator('#confirm-new-password').fill('Accessible123');
    await page.getByRole('button', { name: 'Reset Password' }).click();

    await expect(page.getByRole('heading', { level: 1, name: /password reset/i })).toBeFocused();
    await expect(
      page
        .getByRole('main')
        .getByRole('status')
        .filter({ hasText: /password.*reset successfully/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in|login/i })).toHaveAttribute('href', '/login');
    await checkA11y(page, { stateName: 'auth reset password success', testInfo });
  });

  test('guest returns to the protected destination after login', async ({ page }, testInfo) => {
    await installAuthFixtures(page, { login: 'success' });
    await page.goto('/learning');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign In' })).toBeFocused();
    await checkA11y(page, { stateName: 'auth protected route redirected to login', testInfo });

    await page.getByLabel('Username or Email').fill('student@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Accessible123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/learning$/);
    await expect(page.getByRole('main')).toBeVisible();
    await checkA11y(page, { stateName: 'auth protected destination restored', testInfo });
  });
});
