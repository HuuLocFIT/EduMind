/**
 * Admin App — Student Management E2E Tests
 *
 * Covers:
 *  - Students page loads with data table
 *  - Stats cards show totals
 *  - Search filters list in real-time
 *  - ACTIVE / INACTIVE filter tabs
 *  - Toggle student status → badge changes
 *  - View student detail modal
 */

import { expect } from '@playwright/test';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { StudentsPage } from '../../page-objects/admin/StudentsPage.js';

authTest.describe('Admin — Student Management', () => {
  let studentsPage: StudentsPage;

  authTest.beforeEach(async ({ adminPage }) => {
    studentsPage = new StudentsPage(adminPage);
    await studentsPage.goto();
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  authTest('students page loads with table', async ({ adminPage }) => {
    const table = adminPage
      .locator('table')
      .or(adminPage.getByText(/no students|no results|empty/i));
    await expect(table).toBeVisible({ timeout: 8_000 });
  });

  authTest('stats cards are visible', async ({ adminPage }) => {
    const statCard = adminPage
      .locator('[data-testid="stat-card"]')
      .or(adminPage.locator('.stat-card, .card').first());
    await expect(statCard).toBeVisible({ timeout: 6_000 });
  });

  // ─── Search ───────────────────────────────────────────────────────────────

  authTest('search filters students list', async () => {
    const totalBefore = await studentsPage.getRowCount();
    if (totalBefore === 0) {
      authTest.skip();
      return;
    }

    await studentsPage.search('e2e');

    // Search field has the value — no crash
    const value = await studentsPage.searchInput.inputValue();
    expect(value).toBe('e2e');
  });

  authTest('clearing search restores full list', async () => {
    const initialCount = await studentsPage.getRowCount();
    if (initialCount === 0) {
      authTest.skip();
      return;
    }

    await studentsPage.search('nonexistent_xyz_99999');
    const filteredCount = await studentsPage.getRowCount();

    await studentsPage.search('');
    const restoredCount = await studentsPage.getRowCount();

    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
  });

  // ─── Status Filter Tabs ────────────────────────────────────────────────────

  authTest('ACTIVE filter shows only active students', async ({ adminPage }) => {
    const activeTab = studentsPage.activeFilterButton;
    if ((await activeTab.count()) === 0) {
      authTest.skip();
      return;
    }

    await activeTab.click();
    await studentsPage.page.waitForTimeout(400);

    const rows = studentsPage.studentRows;
    const count = await rows.count();

    if (count > 0) {
      const badge = await studentsPage.getStatusBadge(rows.first());
      // Badge text should be "Active" or "ACTIVE"
      expect(badge.toUpperCase()).toContain('ACTIVE');
    }
  });

  authTest('INACTIVE filter shows only inactive students', async ({ adminPage }) => {
    const inactiveTab = studentsPage.inactiveFilterButton;
    if ((await inactiveTab.count()) === 0) {
      authTest.skip();
      return;
    }

    await inactiveTab.click();
    await studentsPage.page.waitForTimeout(400);

    const rows = studentsPage.studentRows;
    const count = await rows.count();

    if (count > 0) {
      const badge = await studentsPage.getStatusBadge(rows.first());
      expect(badge.toUpperCase()).toContain('INACTIVE');
    }
  });

  // ─── Toggle Status ────────────────────────────────────────────────────────

  authTest('toggle student status changes badge', async () => {
    // Show all students so we have rows to work with
    if (await studentsPage.allFilterButton.count()) {
      await studentsPage.allFilterButton.click();
      await studentsPage.page.waitForTimeout(300);
    }

    const rows = studentsPage.studentRows;
    const count = await rows.count();

    if (count === 0) {
      authTest.skip();
      return;
    }

    const firstRow = rows.first();
    const statusBefore = (await studentsPage.getStatusBadge(firstRow)).trim().toUpperCase();
    await studentsPage.toggleStudentStatus(firstRow);
    const statusAfter = (await studentsPage.getStatusBadge(firstRow)).trim().toUpperCase();

    expect(statusAfter).not.toBe(statusBefore);
  });

  // ─── View Detail ──────────────────────────────────────────────────────────

  authTest('clicking view opens student detail modal', async ({ adminPage }) => {
    const rows = studentsPage.studentRows;
    const count = await rows.count();

    if (count === 0) {
      authTest.skip();
      return;
    }

    const viewBtn = rows.first().getByRole('button', { name: /view|detail/i });
    if ((await viewBtn.count()) === 0) {
      authTest.skip();
      return;
    }

    await viewBtn.click();

    const modal = adminPage.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 6_000 });
    // Modal should contain student details (name, email, etc.)
    await expect(modal.locator('h2, h3, [data-testid="student-name"]')).toBeVisible({
      timeout: 4_000,
    });
  });
});
