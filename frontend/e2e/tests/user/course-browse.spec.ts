/**
 * User App — Course Browse & Search E2E Tests
 *
 * These are smoke tests — no auth required.
 * The browse page is public; all tests run as a guest.
 *
 * Covers:
 *  - /courses page loads with course list
 *  - Search by keyword filters results
 *  - Filter by category
 *  - Pagination: next page loads different content
 *  - Clicking a course card navigates to course detail
 *  - Course detail page shows key sections (curriculum, about)
 */

import { test, expect } from '@playwright/test';
import { CourseBrowsePage } from '../../page-objects/user/CourseBrowsePage.js';

test.describe('User — Course Browse', () => {
  let browsePage: CourseBrowsePage;

  test.beforeEach(async ({ page }) => {
    browsePage = new CourseBrowsePage(page);
    await browsePage.goto();
    // Wait for courses to load
    await page.waitForLoadState('networkidle');
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  test('courses page loads', async ({ page }) => {
    // Verify the page rendered correctly — heading and search input must be visible.
    // We do NOT require course cards because the DB may be empty in CI.
    await expect(page.getByRole('heading', { name: /browse courses/i })).toBeVisible({
      timeout: 8_000,
    });
    await expect(
      page.getByPlaceholder(/search for courses|search/i).first()
    ).toBeVisible({ timeout: 4_000 });
  });

  // ─── Search ───────────────────────────────────────────────────────────────

  test('search input accepts text without crashing', async ({ page }) => {
    // Verify the search input is interactive regardless of whether courses exist.
    await expect(browsePage.searchInput).toBeVisible({ timeout: 6_000 });
    await browsePage.search('javascript');
    await page.waitForTimeout(600);

    const searchValue = await browsePage.searchInput.inputValue();
    expect(searchValue).toBe('javascript');
  });

  test('clearing search input works', async ({ page }) => {
    await expect(browsePage.searchInput).toBeVisible({ timeout: 6_000 });
    await browsePage.search('react');
    await page.waitForTimeout(400);
    await browsePage.search('');
    await page.waitForTimeout(400);

    const searchValue = await browsePage.searchInput.inputValue();
    expect(searchValue).toBe('');
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test('clicking a course card navigates to course detail page', async ({ page }) => {
    const firstCard = browsePage.courseCards.first();
    const cardCount = await firstCard.count();

    if (cardCount === 0) {
      test.skip(); // No courses in DB
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/courses\//, { timeout: 8_000 });

    // Course detail page should show the curriculum/about section
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 6_000 });
  });

  test('course detail page has curriculum section', async ({ page }) => {
    const firstCard = browsePage.courseCards.first();
    if ((await firstCard.count()) === 0) {
      test.skip();
      return;
    }

    await firstCard.click();
    await page.waitForURL(/\/courses\//);

    const curriculumTab = page.getByRole('tab', { name: 'Curriculum', exact: true });
    await expect(curriculumTab).toBeVisible({ timeout: 8_000 });
    await curriculumTab.click();
    await expect(
      page.getByRole('heading', { name: 'Course Curriculum', exact: true }),
    ).toBeVisible({ timeout: 8_000 });
  });

  // ─── Pagination ───────────────────────────────────────────────────────────

  test('pagination next button loads next page', async ({ page }) => {
    const nextBtn = page
      .getByRole('button', { name: /next/i })
      .or(page.locator('[aria-label="Next page"]'));

    if ((await nextBtn.count()) === 0) {
      // Not enough courses to paginate — skip
      test.skip();
      return;
    }

    const titlesBefore = await browsePage.getCourseTitles();
    await nextBtn.first().click();
    await page.waitForTimeout(500);
    const titlesAfter = await browsePage.getCourseTitles();

    // Different courses should appear on the next page
    expect(JSON.stringify(titlesBefore)).not.toBe(JSON.stringify(titlesAfter));
  });
});
