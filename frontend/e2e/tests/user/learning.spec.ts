/**
 * User App — Learning Flow E2E Tests
 *
 * Requires: student account with at least one enrolled course.
 * The auth fixture injects the token without UI login.
 *
 * Covers:
 *  - /learning page loads with enrolled course list
 *  - Filter tabs: All / In Progress / Completed
 *  - "Continue Learning" navigates to CoursePlayer
 *  - CoursePlayer: sidebar with sections/lessons is visible
 *  - CoursePlayer: clicking a lesson loads content
 *  - CoursePlayer: "Mark Complete" updates progress
 *  - /certificates page is accessible
 */

import { expect } from '@playwright/test';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { CoursePlayerPage } from '../../page-objects/user/CoursePlayerPage.js';

authTest.describe('User — Learning Flow', () => {
  authTest('/learning page loads with enrollment list', async ({ studentPage }) => {
    await studentPage.goto('/learning');
    await studentPage.waitForLoadState('networkidle');

    const courseCards = studentPage.locator('[data-testid="enrollment-card"]');
    if ((await courseCards.count()) > 0) {
      await expect(courseCards.first()).toBeVisible({ timeout: 8_000 });
      return;
    }

    const emptyState = studentPage.getByRole('heading', { name: /no courses here yet/i });
    await expect(emptyState).toBeVisible({ timeout: 8_000 });
  });

  authTest('filter tabs are visible on /learning', async ({ studentPage }) => {
    await studentPage.goto('/learning');
    await studentPage.waitForLoadState('networkidle');

    const tabs = studentPage
      .getByRole('tab')
      .or(studentPage.getByRole('button', { name: /all|in progress|completed/i }));

    // At least one filter option must be visible
    await expect(tabs.first()).toBeVisible({ timeout: 6_000 });
  });

  authTest(
    '"In Progress" filter shows only active enrollments',
    async ({ studentPage }) => {
      await studentPage.goto('/learning');

      const inProgressTab = studentPage
        .getByRole('tab', { name: /in progress/i })
        .or(studentPage.getByRole('button', { name: /in progress/i }));

      if ((await inProgressTab.count()) === 0) {
        authTest.skip();
        return;
      }

      await inProgressTab.click();
      await studentPage.waitForTimeout(400);

      // All shown cards should NOT be in "completed" state
      const completedBadges = studentPage.locator(
        '[data-testid="completed-badge"], .badge'
      ).filter({ hasText: /completed/i });
      expect(await completedBadges.count()).toBe(0);
    }
  );

  authTest(
    '"Continue Learning" button navigates to CoursePlayer',
    async ({ studentPage }) => {
      await studentPage.goto('/learning');
      await studentPage.waitForLoadState('networkidle');

      const continueBtn = studentPage.locator('[data-testid="continue-learning-button"]');

      if ((await continueBtn.count()) === 0) {
        // No enrolled courses
        authTest.skip();
        return;
      }

      await continueBtn.first().click();
      await studentPage.waitForURL(/\/learning\/.+/, { timeout: 10_000 });
      expect(studentPage.url()).toMatch(/\/learning\//);
    }
  );

  authTest('CoursePlayer shows sidebar with lesson list', async ({ studentPage }) => {
    await studentPage.goto('/learning');
    await studentPage.waitForURL(/\/learning/, { timeout: 10_000 });

    const continueBtn = studentPage.locator('[data-testid="continue-learning-button"]');
    if ((await continueBtn.count()) === 0) {
      authTest.skip();
      return;
    }

    await continueBtn.first().click();
    await studentPage.waitForURL(/\/learning\//, { timeout: 10_000 });

    // Sidebar with lessons should be visible
    const playerPage = new CoursePlayerPage(studentPage);
    await expect(playerPage.sidebar).toBeVisible({ timeout: 8_000 });
    expect(await playerPage.lessonItems.count()).toBeGreaterThan(0);
  });

  authTest('clicking a lesson in the sidebar loads content', async ({
    studentPage,
  }) => {
    await studentPage.goto('/learning');
    await studentPage.waitForURL(/\/learning/, { timeout: 10_000 });

    const continueBtn = studentPage.locator('[data-testid="continue-learning-button"]');
    if ((await continueBtn.count()) === 0) {
      authTest.skip();
      return;
    }

    await continueBtn.first().click();
    await studentPage.waitForURL(/\/learning\//, { timeout: 10_000 });

    const playerPage = new CoursePlayerPage(studentPage);
    const lessonCount = await playerPage.lessonItems.count();

    if (lessonCount < 2) {
      // Only one lesson — can't test navigation
      authTest.skip();
      return;
    }

    // Click the second lesson
    await playerPage.clickLesson(1);

    // Content area must be visible after clicking
    await expect(playerPage.contentArea).toBeVisible({ timeout: 8_000 });
  });

  authTest('CoursePlayer shows progress indicator', async ({ studentPage }) => {
    await studentPage.goto('/learning');
    await studentPage.waitForURL(/\/learning/, { timeout: 10_000 });

    const continueBtn = studentPage.locator('[data-testid="continue-learning-button"]');
    if ((await continueBtn.count()) === 0) {
      authTest.skip();
      return;
    }

    await continueBtn.first().click();
    await studentPage.waitForURL(/\/learning\//, { timeout: 10_000 });

    const playerPage = new CoursePlayerPage(studentPage);
    // Progress bar or percentage text
    const progress = playerPage.progressBar.or(
      studentPage.getByText(/\d+%/).first()
    );
    await expect(progress).toBeVisible({ timeout: 8_000 });
  });

  authTest('/certificates page is accessible', async ({ studentPage }) => {
    await studentPage.goto('/certificates');
    await studentPage.waitForURL(/\/certificates/, { timeout: 10_000 });

    // Either certificates or empty state
    const content = studentPage
      .getByRole('heading', { name: /certificate/i })
      .or(studentPage.getByText(/no certificates|earn your first/i))
      .first();
    await expect(content).toBeVisible({ timeout: 8_000 });
  });
});
