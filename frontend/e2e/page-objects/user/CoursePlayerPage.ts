import type { Page, Locator } from '@playwright/test';

export class CoursePlayerPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly lessonItems: Locator;
  readonly progressBar: Locator;
  readonly markCompleteButton: Locator;
  readonly contentArea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="course-sidebar"]').or(
      page.locator('aside').filter({ hasText: /course content/i }).first()
    );
    this.lessonItems = page.locator('[data-testid="lesson-item"]').or(
      page.locator('[data-lesson-id]')
    );
    this.progressBar = page.locator('[data-testid="progress-bar"]').or(
      page.getByText(/course progress:\s*\d+%/i).first()
    );
    this.markCompleteButton = page.getByRole('button', {
      name: /mark.*complete|complete lesson/i,
    });
    this.contentArea = page.locator('[data-testid="lesson-content"]').or(
      page.locator('main').first()
    );
  }

  async goto(courseId: number | string) {
    await this.page.goto(`/learning/${courseId}`);
  }

  async clickLesson(index: number) {
    await this.lessonItems.nth(index).scrollIntoViewIfNeeded();
    await this.lessonItems.nth(index).click();
    // Wait for content to load
    await this.page.waitForLoadState('networkidle');
  }

  async markCurrentLessonComplete() {
    await this.markCompleteButton.click();
  }
}
