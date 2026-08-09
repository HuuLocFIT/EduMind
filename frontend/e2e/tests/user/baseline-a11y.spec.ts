import AxeBuilder from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WCAG_AA_TAGS } from '../../utils/accessibility.js';

const { responseForApi } = require('../../pa11y/fixtures.cjs') as {
  responseForApi(pathname: string): {
    status: number;
    contentType: string;
    body: string;
  };
};

const reportDirectory = resolve(
  process.cwd(),
  process.env['A11Y_REPORT_DIR'] || 'e2e/accessibility-reports/before',
);
const allowOverwrite = process.env['A11Y_ALLOW_OVERWRITE'] === 'true';
const reportPurpose =
  process.env['A11Y_REPORT_PURPOSE'] ||
  (process.env['A11Y_REPORT_DIR']
    ? 'after-remediation evidence'
    : 'Phase 0 task 2.4 before-remediation evidence');

async function assertEvidenceCanBeWritten(): Promise<void> {
  if (allowOverwrite) return;

  const evidenceFiles = [
    'summary.json',
    ...routes.map((route) => `${route.name}.json`),
  ];
  for (const file of evidenceFiles) {
    try {
      await access(resolve(reportDirectory, file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    throw new Error(
      `Refusing to overwrite accessibility evidence at ${reportDirectory}. ` +
        'Choose an empty A11Y_REPORT_DIR, or set A11Y_ALLOW_OVERWRITE=true only for an intentional replacement.',
    );
  }
}

const routes = [
  { name: 'home', path: '/', ready: 'main h1' },
  { name: 'courses', path: '/courses', ready: 'main' },
  {
    name: 'course-detail',
    path: '/courses/pa11y-accessibility-fixture',
    ready: 'main h1',
  },
  { name: 'login', path: '/login', ready: 'form' },
  { name: 'signup', path: '/signup', ready: 'form' },
  { name: 'forgot-password', path: '/forgot-password', ready: 'form' },
  { name: 'reset-password-missing-token', path: '/reset-password', ready: 'h1' },
  {
    name: 'checkout-success',
    path: '/checkout/success?order=PA11Y-ORDER-001',
    ready: 'h1',
    authenticated: true,
  },
  {
    name: 'checkout-failed',
    path: '/checkout/failed?errorCode=INSTRUMENT_DECLINED&canRetry=true',
    ready: 'h1',
    authenticated: true,
  },
] as const;

async function installFixtures(page: Page, authenticated: boolean) {
  if (authenticated) {
    await page.addInitScript(() => {
      const user = {
        id: 99001,
        username: 'baseline-student',
        email: 'baseline@example.invalid',
        firstName: 'Baseline',
        lastName: 'Student',
        roles: ['STUDENT'],
        isActive: true,
        isEmailVerified: true,
      };
      localStorage.setItem('accessToken', 'baseline-local-fixture-token');
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user,
            accessToken: 'baseline-local-fixture-token',
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    });
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET') {
      await route.fulfill({
        status: 405,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Baseline fixture blocks state-changing requests',
        }),
      });
      return;
    }
    await route.fulfill(responseForApi(new URL(request.url()).pathname));
  });
}

async function keyboardSnapshot(page: Page, maxTabs = 80) {
  const sequence: Array<{
    index: number;
    selector: string;
    tagName: string;
    name: string;
    hidden: boolean;
    disabled: boolean;
    focusVisible: boolean;
    focusIndicatorChanged: boolean;
  }> = [];
  const issues: string[] = [];
  const seen = new Set<string>();

  await page.locator('body').focus();
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const item = await page.evaluate((tabIndex) => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const readFocusStyle = () => {
        const computed = getComputedStyle(element);
        return {
          outlineStyle: computed.outlineStyle,
          outlineWidth: computed.outlineWidth,
          outlineColor: computed.outlineColor,
          outlineOffset: computed.outlineOffset,
          boxShadow: computed.boxShadow,
        };
      };
      const style = getComputedStyle(element);
      const focusedStyle = readFocusStyle();
      const focusVisible = element.matches(':focus-visible');
      element.blur();
      const unfocusedStyle = readFocusStyle();
      element.focus();
      const outlineWidth = Number.parseFloat(focusedStyle.outlineWidth);
      const outlineChanged =
        outlineWidth >= 2 &&
        focusedStyle.outlineStyle !== 'none' &&
        focusedStyle.outlineStyle !== 'hidden' &&
        focusedStyle.outlineColor !== 'transparent' &&
        (focusedStyle.outlineStyle !== unfocusedStyle.outlineStyle ||
          focusedStyle.outlineWidth !== unfocusedStyle.outlineWidth ||
          focusedStyle.outlineColor !== unfocusedStyle.outlineColor ||
          focusedStyle.outlineOffset !== unfocusedStyle.outlineOffset);
      const shadowLengths = focusedStyle.boxShadow
        .match(/-?\d*\.?\d+px/g)
        ?.map((value) => Math.abs(Number.parseFloat(value))) ?? [];
      const shadowHasArea = shadowLengths.slice(-4).some((value) => value >= 2);
      const shadowChanged =
        shadowHasArea &&
        !focusedStyle.boxShadow.includes('rgba(0, 0, 0, 0)') &&
        focusedStyle.boxShadow !== unfocusedStyle.boxShadow;
      const testId = element.getAttribute('data-testid');
      const selector =
        element.id
          ? `#${CSS.escape(element.id)}`
          : testId
            ? `[data-testid="${CSS.escape(testId)}"]`
            : `${element.tagName.toLowerCase()}[tabindex="${element.tabIndex}"]:nth-of-type(${[...(element.parentElement?.children || [])].indexOf(element) + 1})`;
      const hidden =
        Boolean(element.hidden) ||
        element.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        element.getClientRects().length === 0;
      const disabled =
        element.matches(':disabled') ||
        element.getAttribute('aria-disabled') === 'true';
      return {
        index: tabIndex,
        selector,
        tagName: element.tagName.toLowerCase(),
        name:
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 160) ||
          '',
        hidden,
        disabled,
        focusVisible,
        focusIndicatorChanged: outlineChanged || shadowChanged,
      };
    }, index);

    if (!item) break;
    if (item.hidden) issues.push(`Focus entered hidden element: ${item.selector}`);
    if (item.disabled) issues.push(`Focus entered disabled element: ${item.selector}`);
    if (!item.focusVisible) {
      issues.push(`Keyboard-focused element does not match :focus-visible: ${item.selector}`);
    }
    if (!item.focusIndicatorChanged) {
      issues.push(
        `No focus-induced indicator (decorative shadows ignored): ${item.selector}`,
      );
    }
    if (seen.has(item.selector)) break;
    seen.add(item.selector);
    sequence.push(item);
  }

  if (sequence.length === maxTabs) {
    issues.push(`Focus did not complete a cycle within ${maxTabs} Tab presses`);
  }
  return { sequence, issues };
}

test('collect Axe and keyboard baseline for Phase 0 task 2.4', async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  await assertEvidenceCanBeWritten();
  await mkdir(reportDirectory, { recursive: true });
  const summary = [];

  for (const route of routes) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await installFixtures(
        page,
        'authenticated' in route && route.authenticated === true,
      );
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor({ state: 'visible' });

      const axe = await new AxeBuilder({ page })
        .withTags([...WCAG_AA_TAGS])
        .analyze();
      const keyboard = await keyboardSnapshot(page);
      const result = {
        name: route.name,
        route: route.path,
        pageUrl: page.url(),
        title: await page.title(),
        axe,
        keyboard,
      };
      await writeFile(
        resolve(reportDirectory, `${route.name}.json`),
        JSON.stringify(result, null, 2),
      );
      summary.push({
        name: route.name,
        route: route.path,
        axeViolations: axe.violations.length,
        criticalNodes: axe.violations
          .filter(({ impact }) => impact === 'critical')
          .reduce((count, violation) => count + violation.nodes.length, 0),
        seriousNodes: axe.violations
          .filter(({ impact }) => impact === 'serious')
          .reduce((count, violation) => count + violation.nodes.length, 0),
        keyboardIssues: keyboard.issues.length,
        scanError: null,
      });
    } catch (error) {
      summary.push({
        name: route.name,
        route: route.path,
        axeViolations: 0,
        criticalNodes: 0,
        seriousNodes: 0,
        keyboardIssues: 0,
        scanError: error instanceof Error ? error.stack || error.message : String(error),
      });
    } finally {
      await context.close().catch(() => undefined);
    }
  }

  await writeFile(
    resolve(reportDirectory, 'summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        standard: 'WCAG 2.2 AA (A/AA Axe tags)',
        purpose: reportPurpose,
        routes: summary,
      },
      null,
      2,
    ),
  );
});
