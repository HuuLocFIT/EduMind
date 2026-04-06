import type { Page, Locator } from '@playwright/test';

export class StudentsPage {
  readonly page: Page;
  readonly studentRows: Locator;
  readonly searchInput: Locator;
  readonly activeFilterButton: Locator;
  readonly inactiveFilterButton: Locator;
  readonly allFilterButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.studentRows = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: /^view$/i }),
    });
    this.searchInput = page.locator('main app-search-bar input[type="text"]').first();
    this.activeFilterButton = page.getByRole('button', { name: /^active$/i }).or(
      page.getByRole('tab', { name: /^active$/i })
    );
    this.inactiveFilterButton = page.getByRole('button', { name: /inactive/i }).or(
      page.getByRole('tab', { name: /inactive/i })
    );
    this.allFilterButton = page.getByRole('button', { name: /^all$/i }).or(
      page.getByRole('tab', { name: /^all$/i })
    );
  }

  async goto() {
    await this.page.goto('/students');
    await this.page.waitForLoadState('networkidle');
  }

  getRowByEmail(email: string): Locator {
    return this.studentRows.filter({ hasText: email });
  }

  async getRowCount(): Promise<number> {
    return this.studentRows.count();
  }

  async search(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.waitForTimeout(750);
  }

  async toggleStudentStatus(row: Locator) {
    const toggle = row
      .getByRole('switch')
      .or(row.getByRole('button', { name: /toggle|activate|deactivate/i }));
    await toggle.click();

    const dialog = this.page.locator('[role="dialog"]').first();
    const dialogVisible = await dialog
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);

    if (dialogVisible) {
      await dialog
        .getByRole('button', { name: /activate|deactivate|confirm/i })
        .first()
        .click();
      await dialog.waitFor({ state: 'hidden', timeout: 6_000 }).catch(() => {});
    }

    await this.page.waitForTimeout(700);
  }

  async getStatusBadge(row: Locator): Promise<string> {
    const badge = row.locator('[data-testid="status-badge"]').or(
      row.locator('.badge, span').filter({ hasText: /active|inactive/i })
    );
    return (await badge.textContent()) ?? '';
  }
}
