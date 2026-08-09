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
  { ...lessonBase, id: 9922, sectionId: 9911, title: 'Player overview', contentType: 'VIDEO', videoUrl: '/e2e/accessible-video.mp4', videoDuration: 60, videoCaptionUrl: '/e2e/accessible-captions.vtt', articleContent: '<p>Player overview transcript.</p>', orderIndex: 1 },
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

const completedEnrollment = {
  ...enrollment,
  id: 9802,
  courseId: 9902,
  courseTitle: 'Completed Accessibility Course',
  courseSlug: 'completed-accessibility-course',
  progressPercentage: 100,
  completedLessons: 2,
  totalLessons: 2,
  status: 'COMPLETED',
  completedAt: timestamp,
};

interface ProgressFixture {
  id: number;
  enrollmentId: number;
  lessonId: number;
  lessonTitle: string;
  studentId: number;
  isCompleted: boolean;
  completedAt: string | null;
  watchDuration: number;
  lastPosition: number;
  watchPercentage: number;
  startedAt: string;
  updatedAt: string;
}

const progress: ProgressFixture[] = [{ id: 9701, enrollmentId, lessonId: 9921, lessonTitle: 'Welcome article', studentId: 1, isCompleted: true, completedAt: timestamp, watchDuration: 0, lastPosition: 0, watchPercentage: 100, startedAt: timestamp, updatedAt: timestamp }];

const envelope = (data: unknown, pagination?: object) => ({
  status: 200,
  success: true,
  data,
  ...(pagination ? { pagination } : {}),
});

async function installCoursePlayerFixtures(page: Page, enrolled = true) {
  let currentEnrollment = { ...enrollment };
  let currentProgress = progress.map((item) => ({ ...item }));
  let failNextProgressSave = false;
  const progressSavePayloads: unknown[] = [];

  await page.route('**/e2e/accessible-captions.vtt', (route) => route.fulfill({
    status: 200,
    contentType: 'text/vtt',
    body: 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nAccessible course player caption.\n',
  }));
  await page.route('**/e2e/accessible-video.mp4', (route) => route.fulfill({
    status: 200,
    contentType: 'video/mp4',
    body: '',
  }));

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const fulfill = (data: unknown, pagination?: object) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(data, pagination)) });

    if (pathname.endsWith(`/courses/slug/${slug}`)) return fulfill(course);
    if (pathname.endsWith(`/sections/courses/${courseId}`)) return fulfill(sections);
    if (pathname.endsWith(`/lessons/courses/${courseId}`)) return fulfill(lessons);
    if (pathname.endsWith('/enrollments/my-stats')) {
      return fulfill({ total: 2, active: 1, completed: 1, started: 1 });
    }
    if (pathname.endsWith('/enrollments/my-enrollments')) {
      const status = new URL(request.url()).searchParams.get('status');
      const data = status === 'ACTIVE'
        ? [currentEnrollment]
        : status === 'COMPLETED'
          ? [completedEnrollment]
          : [currentEnrollment, completedEnrollment];
      return fulfill(data, { page: 0, size: 12, totalElements: data.length, totalPages: 1 });
    }
    if (pathname.endsWith(`/enrollments/course/${courseId}`)) {
      if (enrolled) return fulfill(currentEnrollment);
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Enrollment not found' }),
      });
    }
    if (pathname.endsWith(`/enrollments/check/${courseId}`)) return fulfill(enrolled);
    if (pathname.endsWith(`/progress/enrollment/${enrollmentId}`)) return fulfill(currentProgress);
    if (pathname.endsWith('/progress/start')) {
      const lessonId = Number(new URL(request.url()).searchParams.get('lessonId'));
      const existing = currentProgress.find((item) => item.lessonId === lessonId);
      if (existing) return fulfill(existing);
      const started = { ...progress[0], id: 9700 + lessonId, lessonId, lessonTitle: lessons.find((item) => item.id === lessonId)?.title ?? 'Lesson', isCompleted: false, completedAt: null, watchPercentage: 0 };
      currentProgress = [...currentProgress, started];
      return fulfill(started);
    }
    if (pathname.endsWith('/progress/watch') && request.method() === 'PUT') {
      const payload = request.postDataJSON();
      progressSavePayloads.push(payload);
      if (failNextProgressSave) {
        failNextProgressSave = false;
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Progress save failed' }) });
      }
      const saved = { ...progress[0], id: 9702, lessonId: payload.lessonId, lessonTitle: 'Player overview', isCompleted: false, completedAt: null, lastPosition: payload.lastPosition, watchDuration: payload.watchDuration, watchPercentage: 20 };
      currentProgress = [...currentProgress.filter((item) => item.lessonId !== payload.lessonId), saved];
      return fulfill(saved);
    }
    if (pathname.endsWith('/progress/complete') && request.method() === 'PUT') {
      const lessonId = Number(new URL(request.url()).searchParams.get('lessonId'));
      const completed = { ...progress[0], id: 9700 + lessonId, lessonId, lessonTitle: lessons.find((item) => item.id === lessonId)?.title ?? 'Lesson', isCompleted: true, completedAt: timestamp, watchPercentage: 100 };
      currentProgress = [...currentProgress.filter((item) => item.lessonId !== lessonId), completed];
      currentEnrollment = { ...currentEnrollment, completedLessons: 2, progressPercentage: 67 };
      return fulfill(completed);
    }
    if (pathname.endsWith(`/ai/quizzes/lesson/${lessons[2].id}/take`)) {
      return fulfill({
        id: 9601,
        lessonId: lessons[2].id,
        jobId: 9600,
        questionCount: 1,
        createdAt: timestamp,
        questions: [{
          question: 'Which interaction supports keyboard users?',
          options: ['Keyboard-operable controls', 'Pointer-only controls'],
          correctIndex: 0,
          explanation: 'Every action must be keyboard operable.',
        }],
      });
    }
    if (pathname.endsWith(`/ai/quizzes/lesson/${lessons[2].id}/my-attempts`)) return fulfill([]);
    if (pathname.includes('/ai/')) return fulfill(null);
    return route.continue();
  });

  return {
    failNextProgressSave: () => { failNextProgressSave = true; },
    progressSavePayloads,
  };
}

authTest.describe('@a11y-learning Course player structure and navigation', () => {
  authTest('Flow 4 keyboard journey covers learning filters, media, retry and completion', async ({ studentPage }, testInfo) => {
    await studentPage.setViewportSize({ width: 1440, height: 900 });
    await studentPage.addInitScript(() => {
      HTMLMediaElement.prototype.play = function play() {
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function pause() {
        this.dispatchEvent(new Event('pause'));
      };
    });
    const fixture = await installCoursePlayerFixtures(studentPage);

    await studentPage.goto('/learning');
    await expect(studentPage.getByRole('heading', { name: 'My Courses' })).toBeVisible();
    await checkA11y(studentPage, { stateName: 'my learning populated all courses', testInfo });

    const allTab = studentPage.getByRole('tab', { name: /^All,/ });
    await allTab.focus();
    await allTab.press('ArrowRight');
    const inProgressTab = studentPage.getByRole('tab', { name: /^In Progress,/ });
    await expect(inProgressTab).toBeFocused();
    await expect(inProgressTab).toHaveAttribute('aria-selected', 'true');
    await expect(studentPage.getByRole('list', { name: 'active courses' })).toBeVisible();
    await checkA11y(studentPage, { stateName: 'my learning in-progress courses', testInfo });

    const continueLearning = studentPage.getByRole('button', { name: `Continue learning ${course.title}` });
    await continueLearning.focus();
    await continueLearning.press('Enter');
    await expect(studentPage).toHaveURL(new RegExp(`/learning/${slug}`));

    const player = new CoursePlayerPage(studentPage);
    await expect(studentPage.getByRole('heading', { level: 1, name: course.title })).toBeVisible();
    await expect(player.lessonItems.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(player.lessonItems.nth(0)).toHaveAccessibleName(/Completed/);
    await expect(player.lessonItems.nth(2)).toBeEnabled();
    await checkA11y(studentPage, { stateName: 'course player completed and available lessons', testInfo });

    await player.lessonItems.nth(1).press('Enter');
    await expect(player.lessonHeading).toHaveText('Player overview');
    await expect(player.lessonHeading).toBeFocused();

    const videoPlayer = studentPage.getByRole('group', { name: 'Video player' });
    await videoPlayer.focus();
    await videoPlayer.press('k');
    await expect(studentPage.getByRole('button', { name: 'Pause video' })).toBeVisible();
    await videoPlayer.press('ArrowRight');
    await videoPlayer.press('m');
    await expect(studentPage.getByRole('button', { name: 'Unmute video' })).toBeVisible();
    const captions = studentPage.getByRole('button', { name: 'Captions' });
    await captions.focus();
    await captions.press('Enter');
    await expect(captions).toHaveAttribute('aria-pressed', 'true');
    await expect(studentPage.locator('video track[kind="captions"]')).toHaveCount(1);
    await checkA11y(studentPage, { stateName: 'course player keyboard-operated captioned video', testInfo });

    fixture.failNextProgressSave();
    await studentPage.clock.install();
    await studentPage.locator('video').evaluate((element) => {
      const video = element as HTMLVideoElement;
      Object.defineProperty(video, 'duration', { configurable: true, value: 60 });
      video.currentTime = 12;
      video.dispatchEvent(new Event('loadedmetadata'));
      video.dispatchEvent(new Event('timeupdate'));
    });
    await studentPage.clock.fastForward(10_000);
    const saveError = studentPage.getByRole('alert').filter({ hasText: /progress could not be saved/i });
    await expect(saveError).toBeVisible();
    await checkA11y(studentPage, { stateName: 'course player progress save error', testInfo });
    await saveError.getByRole('button', { name: 'Retry saving video progress' }).press('Enter');
    await expect(saveError).toHaveCount(0);
    expect(fixture.progressSavePayloads).toHaveLength(2);
    expect(fixture.progressSavePayloads[1]).toEqual(fixture.progressSavePayloads[0]);

    await player.markCompleteButton.focus();
    await player.markCompleteButton.press('Enter');
    await expect(
      studentPage.getByRole('status').filter({
        hasText: 'Player overview completed. Course progress is 67%.',
      })
    ).toBeVisible();
    await expect(studentPage.getByText('Course Progress: 67%')).toBeVisible();
    await expect(player.lessonItems.nth(1)).toHaveAccessibleName(/Completed/);
    await checkA11y(studentPage, { stateName: 'course player completion updated progress', testInfo });

    await player.lessonItems.nth(2).press('Enter');
    await expect(player.lessonHeading).toHaveText('Knowledge check');
    await expect(player.lessonHeading).toBeFocused();
    await expect(studentPage.getByRole('group', { name: /Which interaction supports keyboard users/ })).toBeVisible();
    await checkA11y(studentPage, { stateName: 'course player selected quiz lesson', testInfo });
  });

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
    await player.sidebarToggle.focus();
    await player.sidebarToggle.press('Enter');
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
