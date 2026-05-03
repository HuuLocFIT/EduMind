import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use placeholder text from actual DOM snapshot: "e.g. lucas or lucas@email.com"
    this.emailInput = page.locator('input[type="text"], input[type="email"]').first();
    // Password field uses bullet dots as placeholder (••••••••), not "password"
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    this.errorMessage = page.locator('[data-testid="login-error"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForDashboard() {
    await this.page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }

  async loginWithRetryOnTransientError(email: string, password: string) {
    await this.login(email, password);

    try {
      await this.waitForDashboard();
      return;
    } catch {
      const hasError = await this.errorMessage.isVisible();
      if (!hasError) {
        throw new Error('Login failed: no redirect to dashboard and no visible error');
      }

      const errorText = (await this.errorMessage.textContent())?.toLowerCase() ?? '';
      const isTransient = errorText.includes('unexpected error occurred');

      if (!isTransient) {
        throw new Error(`Login failed with non-transient error: ${errorText}`);
      }

      await this.login(email, password);
      await this.waitForDashboard();
    }
  }
}
