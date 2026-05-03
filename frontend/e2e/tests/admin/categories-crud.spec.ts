/**
 * Admin App — Categories CRUD E2E Tests
 *
 * This is the most complete CRUD flow in the admin app and serves as
 * a clean end-to-end demo of the Page Object Model pattern.
 *
 * Covers:
 *  - Page loads with category list
 *  - Create new category → appears in list
 *  - Edit existing category → list updates
 *  - Toggle status (ACTIVE ↔ INACTIVE) → badge changes
 *  - Search → filters list in real-time
 *  - Delete → category removed from list
 *
 * Each test uses a unique category name (timestamped) to avoid collisions
 * when tests run in parallel or the DB is not cleaned between runs.
 */

import { expect } from '@playwright/test';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { CategoriesPage } from '../../page-objects/admin/CategoriesPage.js';

// Unique prefix for test data to avoid collisions
const uid = () => Date.now().toString(36);

authTest.describe('Admin — Categories CRUD', () => {
  let categoriesPage: CategoriesPage;

  authTest.beforeEach(async ({ adminPage }) => {
    categoriesPage = new CategoriesPage(adminPage);
    await categoriesPage.goto();
  });

  // ─── Read ────────────────────────────────────────────────────────────────

  authTest('categories page loads with a table', async ({ adminPage }) => {
    const hasRows = (await categoriesPage.getRowCount()) > 0;

    if (hasRows) {
      await expect(categoriesPage.categoryRows.first()).toBeVisible({ timeout: 8_000 });
      return;
    }

    const emptyState = adminPage.getByText(/no categories found|no categories|no results/i);
    await expect(emptyState).toBeVisible({ timeout: 8_000 });
  });

  // ─── Create ───────────────────────────────────────────────────────────────

  authTest('create category → appears in list', async () => {
    const name = `E2E Category ${uid()}`;
    const slug = `e2e-category-${uid()}`;

    await categoriesPage.createCategory({ name, slug });

    // The new category row should appear
    await expect(categoriesPage.getRowByName(name)).toBeVisible({ timeout: 8_000 });
  });

  // ─── Update ───────────────────────────────────────────────────────────────

  authTest('edit category name → list updates', async () => {
    const originalName = `E2E Edit-Me ${uid()}`;
    const updatedName = `E2E Renamed ${uid()}`;

    // First create so we have something to edit
    await categoriesPage.createCategory({ name: originalName });
    await expect(categoriesPage.getRowByName(originalName)).toBeVisible({ timeout: 8_000 });

    await categoriesPage.editCategory(originalName, updatedName);

    await expect(categoriesPage.getRowByName(updatedName)).toBeVisible({ timeout: 8_000 });
    await expect(categoriesPage.getRowByName(originalName)).not.toBeVisible();
  });

  // ─── Toggle Status ────────────────────────────────────────────────────────

  authTest('toggle status changes badge text', async () => {
    const name = `E2E Toggle ${uid()}`;
    await categoriesPage.createCategory({ name });
    await expect(categoriesPage.getRowByName(name)).toBeVisible({ timeout: 8_000 });

    const statusBefore = await categoriesPage.getStatusText(name);
    await categoriesPage.toggleStatus(name);
    const statusAfter = await categoriesPage.getStatusText(name);

    // Status must have changed
    expect(statusAfter.toLowerCase()).not.toBe(statusBefore.toLowerCase());
  });

  // ─── Search ───────────────────────────────────────────────────────────────

  authTest('search filters the list', async () => {
    const name = `E2E Searchable ${uid()}`;
    await categoriesPage.createCategory({ name });
    await expect(categoriesPage.getRowByName(name)).toBeVisible({ timeout: 8_000 });

    // Search for the unique name — only this row should remain
    await categoriesPage.search(name);

    const count = await categoriesPage.getRowCount();
    expect(count).toBe(1);
    await expect(categoriesPage.getRowByName(name)).toBeVisible();

    // Clear search — more rows should return
    await categoriesPage.search('');
    const totalCount = await categoriesPage.getRowCount();
    expect(totalCount).toBeGreaterThanOrEqual(1);
  });

  authTest('search with no match shows empty state', async ({ adminPage }) => {
    await categoriesPage.search('__nonexistent_xyz_12345__');

    const emptyState = adminPage
      .getByText(/no results|no categories|empty/i)
      .or(adminPage.locator('[data-testid="empty-state"]'));
    const rowCount = await categoriesPage.getRowCount();

    // Either empty state message or zero rows
    const isEmpty = (await emptyState.count()) > 0 || rowCount === 0;
    expect(isEmpty).toBe(true);
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  authTest('delete category → marks category as inactive', async () => {
    const name = `E2E Delete-Me ${uid()}`;
    await categoriesPage.createCategory({ name });
    await expect(categoriesPage.getRowByName(name)).toBeVisible({ timeout: 8_000 });

    await categoriesPage.deleteCategory(name);

    const row = categoriesPage.getRowByName(name);
    await expect(row).toBeVisible({ timeout: 8_000 });
    await expect(row.getByText(/inactive/i)).toBeVisible({ timeout: 8_000 });
  });
});
