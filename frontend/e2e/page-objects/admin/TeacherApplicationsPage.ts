import type { Page, Locator } from '@playwright/test';

export class TeacherApplicationsPage {
  readonly page: Page;
  readonly applicationRows: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;
  readonly rejectedTab: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.applicationRows = page.locator('[data-testid="application-row"]');
    this.pendingTab = page.locator('[data-testid="tab-pending"]');
    this.approvedTab = page.locator('[data-testid="tab-approved"]');
    this.rejectedTab = page.locator('[data-testid="tab-rejected"]');
    this.searchInput = page.getByPlaceholder(/search by name or email/i);
  }

  async goto() {
    await this.page.goto('/teachers/applications');
    await this.page.waitForLoadState('networkidle');
  }

  getRowByApplicantName(name: string): Locator {
    return this.applicationRows.filter({ hasText: name });
  }

  async openApplicationDetail(row: Locator) {
    await row.getByRole('button', { name: /view|detail|review/i }).click();
    // Wait for modal
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible' });
  }

  async approveApplication(row: Locator, notes?: string) {
    await row.getByRole('button', { name: /approve/i }).click();
    const dialog = this.page.getByRole('dialog', { name: /approve application/i });
    await dialog.waitFor({ state: 'visible' });
    if (notes) {
      await dialog
        .getByRole('textbox', { name: /add notes about this approval/i })
        .fill(notes);
    }

    const reviewResponsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/admin\/users\/applications\/\d+\/review$/.test(new URL(response.url()).pathname)
    );

    await dialog.getByRole('button', { name: /approve as|approve/i }).click();

    const reviewResponse = await reviewResponsePromise;
    if (!reviewResponse.ok()) {
      throw new Error(`Approve request failed with status ${reviewResponse.status()}`);
    }

    await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async rejectApplication(row: Locator, reason: string) {
    await row.getByRole('button', { name: /reject/i }).click();
    const dialog = this.page.getByRole('dialog', { name: /reject application/i });
    await dialog.waitFor({ state: 'visible' });
    await dialog.getByPlaceholder(/explain why this application is being rejected/i).fill(reason);

    const reviewResponsePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/admin\/users\/applications\/\d+\/review$/.test(new URL(response.url()).pathname)
    );

    await dialog.getByRole('button', { name: /confirm|reject/i }).click();

    const reviewResponse = await reviewResponsePromise;
    if (!reviewResponse.ok()) {
      throw new Error(`Reject request failed with status ${reviewResponse.status()}`);
    }

    await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async getStatusBadge(row: Locator): Promise<string> {
    const badge = row.locator('[data-testid="status-badge"]').or(
      row.locator('.badge, span').filter({ hasText: /pending|approved|rejected/i })
    );
    return (await badge.textContent()) ?? '';
  }
}
