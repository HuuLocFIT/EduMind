import { expect, type Page } from '@playwright/test';
import { test as authTest } from '../../fixtures/auth.fixture.js';
import { checkA11y } from '../../utils/accessibility.js';
import { CoursePlayerPage } from '../../page-objects/user/CoursePlayerPage.js';

const timestamp = '2026-01-01T00:00:00.000Z';
const courseId = 9901;
const enrollmentId = 9801;
const slug = 'course-player-a11y-fixture';

const course = {
  id: courseId,
  title: 'Accessible Course Player',
  slug,
  description: 'A deterministic course-player fixture.',
  shortDescription: 'Accessibility fixture',
  instructorId: 7001,
  instructorName: 'EduMind Accessibility Team',
  category: null,
  price: 0,
  currency: 'USD',
  discountPrice: null,
  effectivePrice: 0,
  thumbnailUrl: null,
  previewVideoUrl: null,
  level: 'BEGINNER',
  language: 'English',
  durationHours: 1,
  status: 'PUBLISHED',
  publishedAt: timestamp,
  hasCertificate: false,
  hasSubtitles: false,
  totalLessons: 3,
  totalStudents: 1,
  averageRating: 0,
  totalReviews: 0,
  sections: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const sections = [
  { id: 9911, courseId, title: 'Introduction', description: null, orderIndex: 0, lessonCount: 2, totalDurationMinutes: 2, createdAt: timestamp, updatedAt: timestamp },
  { id: 9912, courseId, title: 'Practice', description: null, orderIndex: 1, lessonCount: 1, totalDurationMinutes: 1, createdAt: timestamp, updatedAt: timestamp },
];

const lessonBase = { courseId, description: null, videoUrl: null, videoDuration: null, videoUploadStatus: 'NONE', videoPublicId: null, videoStreamUrl: null, video480pUrl: null, videoCaptionUrl: null, articleContent: null, resources: [], isPreview: false, isMandatory: true, createdAt: timestamp, updatedAt: timestamp };
const lessons = [
  { ...lessonBase, id: 9921, sectionId: 9911, title: 'Welcome article', contentType: 'ARTICLE', articleContent: '<p>Welcome to the course.</p>', orderIndex: 0 },
  { ...lessonBase, id: 9922, sectionId: 9911, title: 'Player overview', contentType: 'VIDEO', orderIndex: 1 },
  { ...lessonBase, id: 9923, sectionId: 9912, title: 'Knowledge check', contentType: 'QUIZ', orderIndex: 0 },
];

const enrollment = {
  id: enrollmentId,
  courseId,
  courseTitle: course.title,
  courseSlug: slug,
  studentId: 1,
  progressPercentage: 33,
  completedLessons: 1,
  totalLessons: 3,
  status: 'ACTIVE',
  enrolledAt: timestamp,
  completedAt: null,
  lastAccessedAt: timestamp,
  expiresAt: null,
};

const progress = [{ id: 9701, enrollmentId, lessonId: 9921, lessonTitle: 'Welcome article', studentId: 1, isCompleted: true, completedAt: timestamp, watchDuration: 0, lastPosition: 0, watchPercentage: 100, startedAt: timestamp, updatedAt: timestamp }];

const envelope = (data: unknown, pagination?: object) => ({
  status: 200,
  success: true,
  data,
  ...(pagination ? { pagination } : {}),
});

async function installCoursePlayerFixtures(page: Page, enrolled = true) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const fulfill = (data: unknown, pagination?: object) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(data, pagination)) });

    if (pathname.endsWith(`/courses/slug/${slug}`)) return fulfill(course);
    if (pathname.endsWith(`/sections/courses/${courseId}`)) return fulfill(sections);
    if (pathname.endsWith(`/lessons/courses/${courseId}`)) return fulfill(lessons);
    if (pathname.endsWith(`/enrollments/check/${courseId}`)) return fulfill(enrolled);
    if (pathname.endsWith('/enrollments/my-enrollments')) {
      return fulfill(enrolled ? [enrollment] : [], { page: 0, size: 100, totalElements: enrolled ? 1 : 0, totalPages: enrolled ? 1 : 0 });
    }
    if (pathname.endsWith(`/progress/enrollment/${enrollmentId}`)) return fulfill(progress);
    if (pathname.endsWith('/progress/start')) return fulfill(progress[0]);
    if (pathname.includes('/ai/')) return fulfill(null);
    return route.continue();
  });
}

authTest.describe('@a11y-learning Course player structure and navigation', () => {
  authTest('desktop curriculum supports Axe, accordion, current lesson and focus navigation', async ({ studentPage }, testInfo) => {
    await studentPage.setViewportSize({ width: 1440, height: 900 });
    await installCoursePlayerFixtures(studentPage);
    await studentPage.goto(`/learning/${slug}`);

    const player = new CoursePlayerPage(studentPage);
    await expect(studentPage.getByRole('heading', { level: 1, name: course.title })).toBeVisible();
    await checkA11y(studentPage, { stateName: 'course player desktop selected article', testInfo });

    const sectionToggle = player.sectionToggle(/Introduction/);
    await expect(sectionToggle).toHaveAttribute('aria-expanded', 'true');
    await sectionToggle.press('Enter');
    await expect(sectionToggle).toHaveAttribute('aria-expanded', 'false');
    await sectionToggle.press('Space');

    await player.lessonItems.nth(1).press('Enter');
    await expect(player.lessonHeading).toHaveText('Player overview');
    await expect(player.lessonHeading).toBeFocused();
    await expect(player.lessonItems.nth(1)).toHaveAttribute('aria-current', 'step');
    await checkA11y(studentPage, { stateName: 'course player desktop selected video', testInfo });
  });

  authTest('mobile drawer traps focus while open, closes on Escape, and restores focus', async ({ studentPage }, testInfo) => {
    await studentPage.setViewportSize({ width: 390, height: 844 });
    await installCoursePlayerFixtures(studentPage);
    await studentPage.goto(`/learning/${slug}`);

    const player = new CoursePlayerPage(studentPage);
    await expect(player.sidebarToggle).toBeVisible();
    await checkA11y(studentPage, { stateName: 'course player mobile drawer closed', testInfo });
    await player.sidebarToggle.click();
    await expect(studentPage.getByRole('dialog', { name: 'Course Content' })).toBeVisible();
    await checkA11y(studentPage, { stateName: 'course player mobile drawer open', testInfo });
    await studentPage.keyboard.press('Escape');
    await expect(studentPage.getByRole('dialog', { name: 'Course Content' })).toHaveCount(0);
    await expect(player.sidebarToggle).toBeFocused();
  });

  authTest('access error is an Axe-clean recovery dialog', async ({ studentPage }, testInfo) => {
    await installCoursePlayerFixtures(studentPage, false);
    await studentPage.goto(`/learning/${slug}`);
    const dialog = studentPage.getByRole('alertdialog', { name: 'Enrollment required' });
    await expect(dialog).toBeVisible();
    await expect(studentPage.getByRole('button', { name: 'Go Now' })).toBeFocused();
    await checkA11y(studentPage, { stateName: 'course player enrollment required', testInfo });
  });
});
