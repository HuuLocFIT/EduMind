import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { Result, SerialFrameSelector } from 'axe-core';

export const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
] as const;

export type WcagTag = (typeof WCAG_AA_TAGS)[number];

export interface A11yExclusion {
  selector: string;
  /** Why the exclusion is currently necessary and what user impact remains. */
  reason: string;
  /** Tracking issue, for example A11Y-123 or https://github.com/org/repo/issues/123. */
  issueId: string;
  /** A verifiable condition that causes this exclusion to be removed. */
  removalCondition: string;
}

export interface CheckA11yOptions {
  context?: string | Locator;
  include?: string[];
  exclude?: string[];
  /**
   * Required documentation for every selector in `exclude`.
   * Undocumented or stale entries make the test fail before Axe runs.
   */
  exclusionDocumentation?: A11yExclusion[];
  tags?: WcagTag[];
  stateName: string;
  testInfo: TestInfo;
}

export interface FocusRecord {
  index: number;
  selector: string;
  tagName: string;
  role: string | null;
  accessibleName: string | null;
  disabled: boolean;
  hidden: boolean;
}

export interface KeyboardWalkOptions {
  maxTabs?: number;
  scope?: Locator;
  /**
   * Set for dialogs, menus, and other bounded widgets. Repeating focus before
   * focus leaves this scope is reported as a keyboard trap.
   */
  mustExitScope?: boolean;
}

const ISSUE_ID_PATTERN =
  /^(?:[A-Z][A-Z0-9_-]*-\d+|https?:\/\/\S+\/(?:issues|browse)\/\S+)$/;

async function waitForStableUi(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

function validateExclusions(
  excludes: string[],
  documentation: A11yExclusion[],
): void {
  const documented = new Map(documentation.map((item) => [item.selector, item]));

  for (const selector of excludes) {
    const entry = documented.get(selector);
    if (!entry) {
      throw new Error(
        `Accessibility exclusion "${selector}" is undocumented. Add reason, issueId, and removalCondition.`,
      );
    }
    if (!entry.reason.trim() || !entry.removalCondition.trim()) {
      throw new Error(
        `Accessibility exclusion "${selector}" must have a non-empty reason and removalCondition.`,
      );
    }
    if (!ISSUE_ID_PATTERN.test(entry.issueId)) {
      throw new Error(
        `Accessibility exclusion "${selector}" has invalid issueId "${entry.issueId}". Use A11Y-123 or an issue URL.`,
      );
    }
  }

  for (const selector of documented.keys()) {
    if (!excludes.includes(selector)) {
      throw new Error(
        `Stale accessibility exclusion documentation for "${selector}". Remove it or add the selector to exclude.`,
      );
    }
  }
}

function formatViolations(violations: Result[], stateName: string): string {
  const details = violations.flatMap((violation) => {
    const header = [
      `[${violation.impact?.toUpperCase() ?? 'UNKNOWN'}] ${violation.id}`,
      `WCAG tags: ${violation.tags.join(', ')}`,
      `Help: ${violation.help}`,
      `Guidance: ${violation.helpUrl}`,
    ].join('\n');

    return violation.nodes.map((node, index) =>
      [
        header,
        `Node ${index + 1} selector: ${node.target.join(' > ')}`,
        `HTML: ${node.html}`,
        `Fix: ${node.failureSummary ?? 'See the rule guidance URL.'}`,
      ].join('\n'),
    );
  });

  return `Accessibility check failed for "${stateName}":\n\n${details.join('\n\n')}`;
}

/**
 * Runs the WCAG A/AA Axe gate for a stable UI state.
 *
 * The whole document is scanned unless `context` or `include` is provided.
 * Only critical and serious violations fail the test; the complete report is
 * returned so callers may inspect moderate/minor findings as well.
 */
export async function checkA11y(
  page: Page,
  options: CheckA11yOptions,
): Promise<Awaited<ReturnType<AxeBuilder['analyze']>>> {
  const {
    context,
    include = [],
    exclude = [],
    exclusionDocumentation = [],
    stateName,
    tags = [...WCAG_AA_TAGS],
    testInfo,
  } = options;

  validateExclusions(exclude, exclusionDocumentation);
  await waitForStableUi(page);

  let marker: { locator: Locator; previous: string | null } | undefined;
  const axe = new AxeBuilder({ page }).withTags(tags);

  if (typeof context === 'string') {
    axe.include(context);
  } else if (context) {
    await expect(context, 'Axe context must resolve to one element').toHaveCount(1);
    const markerValue = `a11y-context-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previous = await context.getAttribute('data-a11y-scan-context');
    await context.evaluate((element, value) => {
      element.setAttribute('data-a11y-scan-context', value);
    }, markerValue);
    marker = { locator: context, previous };
    axe.include(`[data-a11y-scan-context="${markerValue}"]`);
  }

  include.forEach((selector) => axe.include(selector as SerialFrameSelector));
  exclude.forEach((selector) => axe.exclude(selector as SerialFrameSelector));

  let results: Awaited<ReturnType<AxeBuilder['analyze']>>;
  try {
    results = await axe.analyze();
  } finally {
    if (marker) {
      await marker.locator.evaluate((element, previous) => {
        if (previous === null) element.removeAttribute('data-a11y-scan-context');
        else element.setAttribute('data-a11y-scan-context', previous);
      }, marker.previous);
    }
  }

  const blockers = results.violations.filter(
    ({ impact }) => impact === 'critical' || impact === 'serious',
  );
  if (blockers.length) {
    const report = JSON.stringify(results, null, 2);
    await testInfo.attach(`axe-${stateName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`, {
      body: Buffer.from(report),
      contentType: 'application/json',
    });
    throw new Error(formatViolations(blockers, stateName));
  }

  return results;
}

async function currentFocus(page: Page, index: number): Promise<FocusRecord> {
  return page.evaluate((tabIndex) => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) {
      throw new Error('Tab did not move focus to an interactive element.');
    }

    const style = getComputedStyle(element);
    const hidden =
      Boolean(element.hidden) ||
      element.getAttribute('aria-hidden') === 'true' ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      element.getClientRects().length === 0;
    const disabled =
      element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true';

    const selector = (() => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute('data-testid');
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
      const parts: string[] = [];
      let node: Element | null = element;
      while (node && node !== document.body) {
        const siblings = node.parentElement
          ? [...node.parentElement.children].filter(
              (candidate) => candidate.tagName === node?.tagName,
            )
          : [];
        const position =
          siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(node) + 1})` : '';
        parts.unshift(`${node.tagName.toLowerCase()}${position}`);
        node = node.parentElement;
      }
      return parts.join(' > ');
    })();

    return {
      index: tabIndex,
      selector,
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      accessibleName:
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent?.trim() ||
        null,
      disabled,
      hidden,
    };
  }, index);
}

export async function tabAndRecordFocus(
  page: Page,
  index = 0,
): Promise<FocusRecord> {
  await page.keyboard.press('Tab');
  const record = await currentFocus(page, index);
  expect(record.hidden, `Focus entered hidden element ${record.selector}`).toBe(false);
  expect(record.disabled, `Focus entered disabled element ${record.selector}`).toBe(false);
  return record;
}

export async function walkKeyboardFocus(
  page: Page,
  options: KeyboardWalkOptions = {},
): Promise<FocusRecord[]> {
  const { maxTabs = 50, scope, mustExitScope = false } = options;
  const records: FocusRecord[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const reachedDocumentBoundary = await page.evaluate(
      () => document.activeElement === document.body,
    );
    if (reachedDocumentBoundary && records.length > 0) return records;

    const record = await currentFocus(page, index);
    expect(record.hidden, `Focus entered hidden element ${record.selector}`).toBe(false);
    expect(record.disabled, `Focus entered disabled element ${record.selector}`).toBe(false);
    const insideScope = scope ? await scope.locator(':focus').count() > 0 : true;

    if (scope && mustExitScope && !insideScope) return records.concat(record);
    if (seen.has(record.selector)) {
      if (scope && mustExitScope) {
        throw new Error(
          `Keyboard trap detected: focus repeated at ${record.selector} before leaving the requested scope.`,
        );
      }
      return records;
    }
    seen.add(record.selector);
    records.push(record);
  }

  throw new Error(
    `Focus did not complete a cycle${mustExitScope ? ' or leave the requested scope' : ''} within ${maxTabs} Tab presses.`,
  );
}

export async function expectFocusVisible(
  locator: Locator,
  screenshotName?: string,
): Promise<void> {
  await expect(locator).toBeFocused();
  const indicator = await locator.evaluate((element: HTMLElement) => {
    const readStyle = () => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        outlineOffset: style.outlineOffset,
        boxShadow: style.boxShadow,
      };
    };
    const focused = readStyle();
    const matchesFocusVisible = element.matches(':focus-visible');
    element.blur();
    const unfocused = readStyle();
    element.focus();

    const outlineWidth = Number.parseFloat(focused.outlineWidth);
    const outlineChanged =
      outlineWidth >= 2 &&
      focused.outlineStyle !== 'none' &&
      focused.outlineStyle !== 'hidden' &&
      focused.outlineColor !== 'transparent' &&
      (focused.outlineStyle !== unfocused.outlineStyle ||
        focused.outlineWidth !== unfocused.outlineWidth ||
        focused.outlineColor !== unfocused.outlineColor ||
        focused.outlineOffset !== unfocused.outlineOffset);
    const shadowLengths = focused.boxShadow
      .match(/-?\d*\.?\d+px/g)
      ?.map((value) => Math.abs(Number.parseFloat(value))) ?? [];
    const shadowHasArea = shadowLengths.slice(-4).some((value) => value >= 2);
    const shadowHasColor =
      focused.boxShadow !== 'none' &&
      !focused.boxShadow.includes('rgba(0, 0, 0, 0)');
    const shadowChanged =
      shadowHasArea &&
      shadowHasColor &&
      focused.boxShadow !== unfocused.boxShadow;

    return { matchesFocusVisible, outlineChanged, shadowChanged };
  });

  expect(
    indicator.matchesFocusVisible,
    'Focused element does not match :focus-visible after keyboard navigation.',
  ).toBe(true);
  expect(
    indicator.outlineChanged || indicator.shadowChanged,
    'Focused element has no focus-induced indicator (decorative shadows are ignored).',
  ).toBe(true);

  if (screenshotName) await expect(locator).toHaveScreenshot(screenshotName);
}
