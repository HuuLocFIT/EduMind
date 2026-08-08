import { test } from '@playwright/test';
import { DiscoverFlowPage } from '../../page-objects/user/DiscoverFlowPage.js';
import { checkA11y } from '../../utils/accessibility.js';

const { responseForApi } = require('../../pa11y/fixtures.cjs') as {
  responseForApi(pathname: string): { status: number; contentType: string; body: string };
};

const category = {
  id: 501,
  name: 'Web Development',
  slug: 'web-development',
  description: 'Web development courses',
  iconUrl: null,
  isActive: true,
  courseCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const timestamp = '2026-01-01T00:00:00.000Z';

async function installDiscoverFixtures(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({
        status: 405,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Fixture blocks writes' }),
      });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname.includes('/categories')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, success: true, data: [category] }),
      });
      return;
    }

    const response = responseForApi(pathname);
    if (pathname.endsWith('/courses/slug/pa11y-accessibility-fixture')) {
      const payload = JSON.parse(response.body);
      payload.data.sections = [
        {
          id: 9101,
          courseId: 9001,
          title: 'Accessible HTML',
          description: 'Semantic structure and landmarks',
          orderIndex: 0,
          lessonCount: 1,
          totalDurationMinutes: 12,
          lessons: [
            {
              id: 9201,
              sectionId: 9101,
              courseId: 9001,
              title: 'Landmarks and headings',
              description: 'Build a meaningful document outline',
              orderIndex: 0,
              durationSeconds: 720,
              isPreview: true,
              isMandatory: true,
              contentType: 'VIDEO',
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 9102,
          courseId: 9001,
          title: 'Keyboard Navigation',
          description: 'Reliable focus and keyboard interaction',
          orderIndex: 1,
          lessonCount: 1,
          totalDurationMinutes: 10,
          lessons: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];
      payload.data.totalLessons = 2;
      response.body = JSON.stringify(payload);
    }
    await route.fulfill(response);
  });
}

test('@a11y @a11y-public Flow 1: keyboard discover journey reaches the guest cart CTA', async ({ page }, testInfo) => {
  await installDiscoverFixtures(page);
  const flow = new DiscoverFlowPage(page);

  await flow.openHomeAndUseSkipLink();
  await checkA11y(page, { stateName: 'discover home after skip link', testInfo });

  await flow.keyboardNavigateToBrowse();
  await flow.searchAndFilter();
  await checkA11y(page, { stateName: 'discover filtered course results', testInfo });

  await flow.openFixtureCourse();
  await checkA11y(page, { stateName: 'discover guest course detail', testInfo });

  await flow.expandCurriculum();
  await checkA11y(page, { stateName: 'discover expanded curriculum', testInfo });

  await flow.activateGuestCartCta();
  await checkA11y(page, { stateName: 'discover guest cart sign-in destination', testInfo });
});
