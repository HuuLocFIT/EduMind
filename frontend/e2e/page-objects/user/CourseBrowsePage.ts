import type { Page, Locator } from '@playwright/test';

export class CourseBrowsePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly courseCards: Locator;
  readonly categoryFilter: Locator;
  readonly paginationNext: Locator;

  constructor(page: Page) {
    this.page = page;
    // Actual placeholder: "Search for courses, skills, or teachers..."
    this.searchInput = page.getByPlaceholder(/search for courses|search/i).first();
    this.courseCards = page.locator('[data-testid="course-card"]').or(
      page.locator('article').filter({ has: page.locator('h2, h3') })
    );
    this.categoryFilter = page.getByRole('combobox', { name: /category/i }).or(
      page.locator('select[name="category"]')
    );
    this.paginationNext = page.getByRole('button', { name: /next page|>/i }).last();
  }

  async goto() {
    await this.page.goto('/courses');
  }

  async search(keyword: string) {
    await this.searchInput.fill(keyword);
    // Wait for debounced filter to apply
    await this.page.waitForTimeout(500);
  }

  async selectCategory(name: string) {
    // Try combobox first, fallback to button/tab-style filter
    const categoryButton = this.page.getByRole('button', { name }).or(
      this.page.getByRole('option', { name })
    );
    if (await categoryButton.count()) {
      await categoryButton.first().click();
    } else {
      await this.categoryFilter.selectOption({ label: name });
    }
    await this.page.waitForTimeout(400);
  }

  async getCourseTitles(): Promise<string[]> {
    return this.courseCards.locator('h2, h3').allTextContents();
  }

  async clickFirstCourse() {
    await this.courseCards.first().click();
    await this.page.waitForURL(/\/courses\/\d+|\/courses\/.+/);
  }
}
