import type { Page, Locator } from '@playwright/test';

export class CategoriesPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly categoryRows: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByRole('button', { name: /create|add.*category|new category/i });
    this.searchInput = page.locator('app-search-bar input[type="text"]').first();
    // Each category row in the data table
    this.categoryRows = page.locator('[data-testid="category-row"]');
    this.saveButton = page.getByRole('button', { name: /^save$|^create$|^submit$/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.confirmDeleteButton = page.getByRole('button', { name: /confirm|yes.*delete|delete/i });
  }

  async goto() {
    await this.page.goto('/categories');
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createCategory(data: { name: string; slug?: string; description?: string }) {
    await this.createButton.click();
    const dialog = this.page.getByRole('dialog').first();
    await dialog.locator('input[placeholder*="category name" i]').first().fill(data.name);
    if (data.slug) {
      await dialog.locator('input[placeholder*="slug" i]').first().fill(data.slug);
    }
    if (data.description) {
      await dialog.locator('textarea[placeholder*="description" i]').first().fill(data.description);
    }
    await dialog.getByRole('button', { name: /create category|create|save|submit/i }).first().click();
    // Wait for the modal to close and list to refresh
    await this.page.waitForTimeout(800);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async search(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.waitForTimeout(400);
  }

  /** Returns row locator for a category identified by its name text. */
  getRowByName(name: string): Locator {
    return this.categoryRows.filter({ hasText: name });
  }

  async getRowCount(): Promise<number> {
    return this.page.locator('[data-testid="category-row"]').count();
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async editCategory(name: string, newName: string) {
    const row = this.getRowByName(name);
    await row.getByRole('button', { name: /edit/i }).click();
    const dialog = this.page.getByRole('dialog').first();
    const nameField = dialog.locator('input[placeholder*="category name" i]').first();
    await nameField.clear();
    await nameField.fill(newName);
    await dialog.getByRole('button', { name: /update category|update|save|submit/i }).first().click();
    await this.page.waitForTimeout(800);
  }

  // ─── Toggle Status ─────────────────────────────────────────────────────────

  async toggleStatus(name: string) {
    const row = this.getRowByName(name);
    // Toggle switch or button — try common patterns
    const toggle = row
      .getByRole('switch')
      .or(row.getByRole('button', { name: /toggle|activate|deactivate/i }));
    await toggle.click();
    await this.page.waitForTimeout(600);
  }

  /** Returns the text of the status badge for the given category. */
  async getStatusText(name: string): Promise<string> {
    const row = this.getRowByName(name);
    const badge = row.locator('[data-testid="status-badge"]').or(
      row.locator('.badge, span').filter({ hasText: /active|inactive/i })
    );
    return (await badge.textContent()) ?? '';
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteCategory(name: string) {
    const row = this.getRowByName(name);
    await row.getByRole('button', { name: /delete/i }).click();
    // Confirm dialog
    const dialog = this.page.getByRole('dialog').first();
    await dialog.getByRole('button', { name: /delete|confirm|yes/i }).first().click();
    await this.page.waitForTimeout(600);
  }
}
