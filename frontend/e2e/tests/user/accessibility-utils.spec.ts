import { expect, test } from '@playwright/test';
import {
  checkA11y,
  expectFocusVisible,
  tabAndRecordFocus,
  walkKeyboardFocus,
} from '../../utils/accessibility.js';

test.describe('accessibility test utilities', () => {
  test('scans a Locator context and restores its DOM attributes', async ({
    page,
  }, testInfo) => {
    await page.setContent(`
      <main id="scan-target">
        <h1>Accessible fixture</h1>
        <button>Continue</button>
      </main>
    `);
    const context = page.locator('#scan-target');

    const report = await checkA11y(page, {
      context,
      stateName: 'utility fixture',
      testInfo,
    });

    expect(report.violations).toEqual([]);
    await expect(context).not.toHaveAttribute('data-a11y-scan-context', /.+/);
  });

  test('requires structured documentation for every exclusion', async ({
    page,
  }, testInfo) => {
    await page.setContent('<main><h1>Fixture</h1></main>');

    await expect(
      checkA11y(page, {
        stateName: 'undocumented exclusion',
        exclude: ['.third-party-widget'],
        testInfo,
      }),
    ).rejects.toThrow(/is undocumented/);
  });

  test('records focus, completes a cycle, and verifies focus visibility', async ({
    page,
  }) => {
    await page.setContent(`
      <style>button:focus-visible { outline: 3px solid rgb(0, 0, 0); }</style>
      <button id="first">First</button>
      <button id="second">Second</button>
    `);

    const first = await tabAndRecordFocus(page);
    expect(first.selector).toBe('#first');
    await expectFocusVisible(page.locator('#first'));

    // Continue from the focused first button until the document boundary.
    const order = await walkKeyboardFocus(page, { maxTabs: 4 });
    expect(order.map(({ selector }) => selector)).toEqual(['#second']);
  });

  test('rejects decorative shadows and indicators thinner than two pixels', async ({
    page,
  }) => {
    await page.setContent(`
      <style>
        #decorative { box-shadow: rgb(0, 0, 0) 0 8px 20px; }
        #thin:focus-visible { outline: 1px solid rgb(0, 0, 0); }
      </style>
      <button id="decorative">Decorative shadow</button>
      <button id="thin">Thin outline</button>
    `);

    await page.keyboard.press('Tab');
    await expect(expectFocusVisible(page.locator('#decorative'))).rejects.toThrow(
      /no focus-induced indicator/i,
    );
    await page.keyboard.press('Tab');
    await expect(expectFocusVisible(page.locator('#thin'))).rejects.toThrow(
      /no focus-induced indicator/i,
    );
  });

  test('attaches a JSON Axe report before failing on a serious blocker', async ({
    page,
  }, testInfo) => {
    await page.setContent('<main><button></button></main>');

    await expect(
      checkA11y(page, {
        stateName: 'unnamed button blocker',
        testInfo,
      }),
    ).rejects.toThrow(/button-name/);

    const attachment = testInfo.attachments.find(
      ({ name, contentType }) =>
        name === 'axe-unnamed-button-blocker.json' &&
        contentType === 'application/json',
    );
    expect(attachment?.body).toBeTruthy();
    expect(JSON.parse(attachment?.body?.toString() ?? '{}').violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'button-name' })]),
    );
  });

  test('detects a focus trap in a bounded widget', async ({ page }) => {
    await page.setContent(`
      <div id="dialog">
        <button id="one">One</button>
        <button id="two">Two</button>
      </div>
      <button id="outside">Outside</button>
      <script>
        const dialog = document.querySelector('#dialog');
        dialog.addEventListener('keydown', (event) => {
          if (event.key !== 'Tab') return;
          event.preventDefault();
          const target = document.activeElement.id === 'one' ? '#two' : '#one';
          document.querySelector(target).focus();
        });
      </script>
    `);
    await page.locator('#one').focus();

    await expect(
      walkKeyboardFocus(page, {
        maxTabs: 5,
        scope: page.locator('#dialog'),
        mustExitScope: true,
      }),
    ).rejects.toThrow(/Keyboard trap detected/);
  });
});
