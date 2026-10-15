/**
 * User App — Content-Security-Policy E2E Tests
 *
 * Walks the main user flows and fails on any CSP violation (enforced or
 * report-only). The policy lives in frontend/vercel.json and is served
 * locally by `vite preview` (see apps/user/vite.config.ts), so these tests
 * must run against a preview build, not the dev server:
 *
 *   npx nx run user:prerender
 *   npx vite preview --config apps/user/vite.config.ts --outDir ../../dist/apps/user
 *   npx playwright test -c e2e/playwright.config.ts e2e/tests/user/csp.spec.ts
 *
 * Covers:
 *  - Public pages: home, /courses, course detail, /login
 *  - Course player with video lesson
 *  - AI Tutor chat (SSE stream to the API)
 */

import { expect, type Page, type Response } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture.js';
import { API_BASE_URL } from '../../fixtures/data.fixture.js';

interface CspViolation {
  source: 'event' | 'console';
  detail: string;
}

/**
 * Collect CSP violations for the lifetime of the page. Uses
 * exposeFunction (survives navigations) plus the console, which also
 * reports violations the event listener cannot see (e.g. during parsing
 * before the init script listener is attached).
 */
async function trackCspViolations(page: Page): Promise<CspViolation[]> {
  const violations: CspViolation[] = [];

  await page.exposeFunction('__reportCspViolation', (detail: string) => {
    violations.push({ source: 'event', detail });
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const report = (window as unknown as {
        __reportCspViolation: (detail: string) => void;
      }).__reportCspViolation;
      report(
        `${e.disposition} ${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'} at ${e.sourceFile}:${e.lineNumber}`
      );
    });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
      violations.push({ source: 'console', detail: msg.text() });
    }
  });

  return violations;
}

/** Fail fast when the server is not sending the CSP (e.g. dev server). */
function expectCspHeader(response: Response | null): void {
  expect(response, 'document response').not.toBeNull();
  const headers = response?.headers() ?? {};
  const csp =
    headers['content-security-policy'] ??
    headers['content-security-policy-report-only'];
  expect(
    csp,
    'No CSP header on the document. Run these tests against `vite preview`, not the dev server.'
  ).toBeTruthy();
}

async function visit(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expectCspHeader(response);
  await page.waitForLoadState('networkidle');
}

async function firstCourseSlug(page: Page): Promise<string | null> {
  const response = await page.request
    .get(`${API_BASE_URL}/api/courses/filter?size=1`)
    .catch(() => null);
  if (!response?.ok()) return null;
  const json = await response.json();
  const courses = json?.data?.content ?? json?.data ?? json?.content ?? [];
  return Array.isArray(courses) && courses[0]?.slug ? courses[0].slug : null;
}

test.describe('User — Content-Security-Policy', () => {
  test('public pages load without CSP violations', async ({ page }) => {
    const violations = await trackCspViolations(page);

    await visit(page, '/');
    await visit(page, '/courses');

    const slug = await firstCourseSlug(page);
    if (slug) {
      await visit(page, `/courses/${slug}`);
    }

    await visit(page, '/login');

    expect(violations).toEqual([]);
  });

  test('course player and AI Tutor load without CSP violations', async ({ studentPage }) => {
    const violations = await trackCspViolations(studentPage);

    await visit(studentPage, '/learning');

    const continueBtn = studentPage.locator('[data-testid="continue-learning-button"]');
    if ((await continueBtn.count()) === 0) {
      test.skip(true, 'E2E student has no enrolled course');
      return;
    }

    await continueBtn.first().click();
    await studentPage.waitForURL(/\/learning\/.+/, { timeout: 10_000 });
    await studentPage.waitForLoadState('networkidle');

    // Let the lesson video (Cloudinary) and captions start loading.
    const video = studentPage.locator('video').first();
    if ((await video.count()) > 0) {
      await video.evaluate((el: HTMLVideoElement) => el.play().catch(() => undefined));
      await studentPage.waitForTimeout(2_000);
    }

    // AI Tutor: open the panel and send one question over SSE.
    const openTutor = studentPage.getByRole('button', { name: 'Open AI Tutor' });
    if ((await openTutor.count()) > 0) {
      await openTutor.click();
      const input = studentPage.getByLabel('Ask the AI Tutor a question');
      await expect(input).toBeVisible({ timeout: 8_000 });
      await input.fill('Summarize this lesson in one sentence.');
      await input.press('Enter');
      // Wait for the stream request to finish (success, 429, or error).
      await studentPage
        .waitForResponse((res) => res.url().includes('/api/ai/'), { timeout: 30_000 })
        .catch(() => undefined);
      await studentPage.waitForTimeout(3_000);
    }

    expect(violations).toEqual([]);
  });
});
