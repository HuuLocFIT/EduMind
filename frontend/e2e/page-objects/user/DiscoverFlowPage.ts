import { expect, type Locator, type Page } from '@playwright/test';

export class DiscoverFlowPage {
  readonly page: Page;
  readonly skipLink: Locator;
  readonly browseLink: Locator;
  readonly searchInput: Locator;
  readonly beginnerFilter: Locator;
  readonly fixtureCourseLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    this.browseLink = page
      .locator('#main-content')
      .getByRole('link', { name: 'Explore courses', exact: true })
      .first();
    this.searchInput = page.getByRole('textbox', { name: 'Search courses' });
    this.beginnerFilter = page.getByRole('checkbox', { name: 'Beginner', exact: true });
    this.fixtureCourseLink = page.getByRole('link', {
      name: /Accessible Web Foundations/,
    });
  }

  async openHomeAndUseSkipLink() {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    await this.page.keyboard.press('Tab');
    await expect(this.skipLink).toBeFocused();
    await this.page.keyboard.press('Enter');
    const mainHeading = this.page.locator('#main-content').getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeFocused();
    await expect(mainHeading).toHaveAttribute('tabindex', '-1');
  }

  async keyboardNavigateToBrowse() {
    await expect(this.browseLink).toBeVisible();
    for (let tabs = 0; tabs < 30; tabs += 1) {
      await this.page.keyboard.press('Tab');
      if (await this.browseLink.evaluate((element) => element === document.activeElement)) {
        await this.page.keyboard.press('Enter');
        await this.page.waitForURL(/\/courses(?:\?.*)?$/);
        return;
      }
    }
    throw new Error('Explore courses did not receive focus within 30 Tab presses.');
  }

  async searchAndFilter() {
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill('accessible');
    await this.page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(this.page.locator('#course-results-summary')).toContainText('1 course');

    await this.beginnerFilter.check();
    await expect(this.beginnerFilter).toBeChecked();
    await expect(this.page).toHaveURL(/levels=BEGINNER/);
    await expect(this.fixtureCourseLink).toBeVisible();
  }

  async openFixtureCourse() {
    await this.fixtureCourseLink.click();
    await this.page.waitForURL(/\/courses\/pa11y-accessibility-fixture$/);
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Accessible Web Foundations' }),
    ).toBeVisible();
  }

  async expandCurriculum() {
    await this.page.getByRole('tab', { name: 'Curriculum' }).click();
    const expandAll = this.page.getByRole('button', { name: 'Expand all sections' });
    await expect(expandAll).toHaveAttribute('aria-expanded', 'false');
    await expandAll.click();
    await expect(
      this.page.getByRole('button', { name: 'Collapse all sections' }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(this.page.getByRole('region', { name: 'Accessible HTML' })).toBeVisible();
  }

  async activateGuestCartCta() {
    const addToCart = this.page.getByRole('button', { name: 'Add to Cart' });
    await expect(addToCart).toBeEnabled();
    await addToCart.click();
    await this.page.waitForURL(/\/login(?:\?.*)?$/);
    await expect(
      this.page.getByRole('heading', { level: 1, name: 'Sign In', exact: true }),
    ).toBeVisible();
  }
}
