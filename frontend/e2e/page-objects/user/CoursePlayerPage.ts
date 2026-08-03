import type { Page, Locator } from '@playwright/test';

export class CoursePlayerPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly lessonItems: Locator;
  readonly progressBar: Locator;
  readonly markCompleteButton: Locator;
  readonly contentArea: Locator;
  readonly sidebarToggle: Locator;
  readonly lessonHeading: Locator;
  readonly exitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.getByRole('navigation', { name: 'Course Content' }).or(
      page.getByRole('dialog', { name: 'Course Content' })
    ).first();
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
    this.sidebarToggle = page.getByRole('button', { name: /open|close course content/i });
    this.lessonHeading = page.locator('#course-player-main').getByRole('heading', { level: 2 }).first();
    this.exitButton = page.getByRole('button', {
      name: 'Exit course player and return to My Learning',
    }).first();
  }

  async goto(courseSlug: string) {
    await this.page.goto(`/learning/${courseSlug}`);
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

  sectionToggle(name: string | RegExp) {
    return this.page.getByRole('button', { name });
  }

  async openSidebar() {
    if (await this.sidebarToggle.isVisible()) {
      await this.sidebarToggle.click();
    }
  }
}
