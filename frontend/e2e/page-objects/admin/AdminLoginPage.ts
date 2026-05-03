import type { Page, Locator } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder*="email" i], input[placeholder*="username" i]').first();
    this.passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    this.errorMessage = page.locator('[data-testid="error-message"]').or(
      page.getByRole('alert')
    );
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.usernameInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForDashboard() {
    await this.page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }

  async loginWithRetryOnTransientError(email: string, password: string) {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.login(email, password);

      try {
        await this.waitForDashboard();
        return;
      } catch {
        const hasError = await this.errorMessage.first().isVisible();
        if (!hasError) {
          throw new Error('Admin login failed: no redirect to dashboard and no visible error');
        }

        const errorText = (await this.errorMessage.first().textContent())?.toLowerCase() ?? '';
        const isTransient = errorText.includes('unexpected error occurred');

        if (!isTransient) {
          throw new Error(`Admin login failed with non-transient error: ${errorText}`);
        }

        if (attempt === maxAttempts) {
          throw new Error(`Admin login failed after ${maxAttempts} transient retries`);
        }
      }
    }
  }
}
