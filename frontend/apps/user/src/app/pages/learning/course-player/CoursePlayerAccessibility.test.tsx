import React, { createRef } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ContentType, EnrollmentStatus } from '@edumind/shared-constants';
import type {
  CourseDetailResponse,
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { CourseCurriculumSidebar } from './components/CourseCurriculumSidebar';
import { CourseAccessErrorDialog } from './components/CourseAccessErrorDialog';
import { CoursePlayerHeader } from './components/CoursePlayerHeader';
import { LessonNavigation } from './components/LessonNavigation';
import { CoursePlayerPage } from './CoursePlayerPage';

const assertNoSeriousViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, { resultTypes: ['violations'] });
  expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
};

const { mockNavigate, mockSetSearchParams } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetSearchParams: vi.fn(),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  ProgressBar: ({ progress }: { progress: number }) => (
    <div
      role="progressbar"
      aria-label="Course progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  ),
  Loading: () => <div>Loading...</div>,
  useModal: () => ({ isOpen: false, open: vi.fn(), close: vi.fn(), toggle: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ courseSlug: 'accessible-react' }),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  useLocation: () => ({ pathname: '/learning/accessible-react' }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), prefetchQuery: vi.fn() }),
}));

vi.mock('../../../services/course.service', () => ({
  courseService: { getCourseBySlug: vi.fn() },
}));
vi.mock('../../../services/section.service', () => ({
  sectionService: { getCourseSections: vi.fn() },
}));
vi.mock('../../../services/lesson.service', () => ({
  lessonService: { getCourseLessons: vi.fn() },
}));
vi.mock('../../../services/enrollment.service', () => ({
  enrollmentService: {
    getMyEnrollmentForCourse: vi.fn(),
  },
}));
vi.mock('../../../services/lesson-progress.service', () => ({
  lessonProgressService: {
    startLesson: vi.fn(),
    updateWatchProgress: vi.fn(),
    completeLesson: vi.fn(),
    getEnrollmentProgress: vi.fn(),
  },
}));
vi.mock('../../../services/ai.service', () => ({
  aiService: {
    getQuizForStudent: vi.fn(),
    getSummaryByLesson: vi.fn(),
    getMyAttempts: vi.fn(),
  },
}));
vi.mock('../../../stores/aiChat.store', () => ({
  useAiChatStore: () => ({ isOpen: false, closeChat: vi.fn(), toggleChat: vi.fn() }),
}));
vi.mock('../../../components/learning/InlineQuizTaker', () => ({
  InlineQuizTaker: () => (
    <div>
      <fieldset>
        <legend>Mock question</legend>
        <label>
          <input type="radio" name="mock-q" />
          Option A
        </label>
      </fieldset>
    </div>
  ),
}));
vi.mock('../../../components/learning/QuizTakerModal', () => ({
  QuizTakerModal: () => null,
}));
vi.mock('../../../components/learning/LessonSummaryPanel', () => ({
  LessonSummaryPanel: () => null,
}));

import { courseService } from '../../../services/course.service';
import { sectionService } from '../../../services/section.service';
import { lessonService } from '../../../services/lesson.service';
import { enrollmentService } from '../../../services/enrollment.service';
import { lessonProgressService } from '../../../services/lesson-progress.service';
import { aiService } from '../../../services/ai.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sections = [
  { id: 10, title: 'Introduction', orderIndex: 0 },
  { id: 20, title: 'Practice', orderIndex: 1 },
] as SectionResponse[];

const course = {
  id: 100,
  title: 'Accessible React',
  slug: 'accessible-react',
} as CourseDetailResponse;

const videoLesson = {
  id: 1,
  sectionId: 10,
  title: 'Watch the video',
  contentType: ContentType.VIDEO,
  orderIndex: 0,
  videoDuration: 120,
  videoStreamUrl: 'https://example.com/stream.m3u8',
  videoCaptionUrl: 'https://example.com/captions.vtt',
  articleContent: '<p>This is the video transcript.</p>',
} as LessonResponse;

const articleLesson = {
  id: 2,
  sectionId: 10,
  title: 'Read the guide',
  contentType: ContentType.ARTICLE,
  orderIndex: 1,
  articleContent: '<h3>Guide</h3><ul><li>Point one</li></ul>',
} as LessonResponse;

const quizLesson = {
  id: 3,
  sectionId: 20,
  title: 'Knowledge check',
  contentType: ContentType.QUIZ,
  orderIndex: 0,
} as LessonResponse;

const baseEnrollment: EnrollmentResponse = {
  id: 50,
  courseId: 100,
  courseTitle: 'Accessible React',
  courseSlug: 'accessible-react',
  studentId: 7,
  status: EnrollmentStatus.ACTIVE,
  progressPercentage: 33,
  completedLessons: 0,
  totalLessons: 3,
  enrolledAt: '2026-01-01T00:00:00.000Z',
} as EnrollmentResponse;

const completedProgress = {
  id: 90,
  enrollmentId: 50,
  lessonId: 1,
  lessonTitle: 'Watch the video',
  studentId: 7,
  isCompleted: true,
  watchPercentage: 100,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as LessonProgressResponse;

// ─── Media mocks ──────────────────────────────────────────────────────────────

let mediaCurrentTime = 0;
let currentEnrollment: EnrollmentResponse = baseEnrollment;
let currentLessons: LessonResponse[] = [videoLesson, articleLesson, quizLesson];

const installMediaPrototypes = () => {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
    configurable: true,
    get: () => mediaCurrentTime,
    set: (v: number) => { mediaCurrentTime = v; },
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get: () => 100,
    set: () => undefined,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'volume', {
    configurable: true,
    get: () => 1,
    set: () => undefined,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'muted', {
    configurable: true,
    get: () => false,
    set: () => undefined,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'buffered', {
    configurable: true,
    get: () => ({ length: 0, start: () => 0, end: () => 0 }),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'textTracks', {
    configurable: true,
    get: () => ({ length: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => null,
  });
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined) as typeof document.exitFullscreen;
};

const installCaptionFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['WEBVTT'])),
    }),
  );
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
};

beforeEach(() => {
  vi.clearAllMocks();
  mediaCurrentTime = 0;
  currentEnrollment = baseEnrollment;
  currentLessons = [videoLesson, articleLesson, quizLesson];

  installMediaPrototypes();
  installCaptionFetch();

  vi.mocked(courseService.getCourseBySlug).mockResolvedValue(course);
  vi.mocked(sectionService.getCourseSections).mockResolvedValue(sections);
  vi.mocked(lessonService.getCourseLessons).mockImplementation(() => Promise.resolve(currentLessons));
  vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockImplementation(() =>
    Promise.resolve(currentEnrollment),
  );
  vi.mocked(lessonProgressService.startLesson).mockResolvedValue({} as any);
  vi.mocked(lessonProgressService.getEnrollmentProgress).mockResolvedValue([]);
  vi.mocked(lessonProgressService.completeLesson).mockResolvedValue({} as any);
  vi.mocked(lessonProgressService.updateWatchProgress).mockResolvedValue({} as any);
  vi.mocked(aiService.getQuizForStudent).mockResolvedValue(null);
  vi.mocked(aiService.getSummaryByLesson).mockResolvedValue(null);
  vi.mocked(aiService.getMyAttempts).mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderPage = async () => {
  const result = render(<CoursePlayerPage />);
  await screen.findByRole('heading', { level: 2, name: 'Watch the video' });
  return result;
};

const settlePage = async () => {
  await act(async () => undefined);
  await act(async () => undefined);
};

const advanceTimersAndFlush = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

// ─── Sidebar / access dialog tests (existing coverage) ────────────────────────

const renderSidebar = (overrides: Partial<React.ComponentProps<typeof CourseCurriculumSidebar>> = {}) => {
  const onClose = vi.fn();
  const onSelectLesson = vi.fn();
  const onToggleSection = vi.fn();

  render(
    <CourseCurriculumSidebar
      isOpen
      isDesktop
      sections={sections}
      lessons={lessons}
      currentLessonId={1}
      completedLessonIds={new Set([1])}
      completedLessons={1}
      videoProgress={50}
      expandedSectionIds={[10, 20]}
      onToggleSection={onToggleSection}
      onSelectLesson={onSelectLesson}
      onClose={onClose}
      activeLessonRef={createRef<HTMLButtonElement>()}
      sidebarScrollRef={createRef<HTMLDivElement>()}
      {...overrides}
    />
  );

  return { onClose, onSelectLesson, onToggleSection };
};

const lessons = [
  { id: 1, sectionId: 10, title: 'Welcome', orderIndex: 0, contentType: ContentType.VIDEO, videoDuration: 120 },
  { id: 2, sectionId: 10, title: 'Read the guide', orderIndex: 1, contentType: ContentType.ARTICLE },
  { id: 3, sectionId: 20, title: 'Knowledge check', orderIndex: 0, contentType: ContentType.QUIZ },
] as LessonResponse[];

describe('CoursePlayer accessibility', () => {
  it('uses compact player controls on short viewports without changing their accessible names', () => {
    render(
      <>
        <CoursePlayerHeader
          courseTitle="Accessible React"
          progressPercentage={40}
          sidebarOpen={false}
          sidebarToggleRef={createRef<HTMLButtonElement>()}
          onExit={vi.fn()}
          onToggleSidebar={vi.fn()}
        />
        <LessonNavigation
          hasPrevious
          hasNext
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          previousLessonTitle="Intro"
          nextLessonTitle="Quiz"
        />
      </>,
    );

    expect(screen.getByRole('button', { name: /Exit course player/ })).toHaveClass(
      '[@media(max-height:32rem)]:h-10',
    );
    expect(screen.getByRole('banner')).toHaveClass('[@media(max-height:32rem)]:static');
    expect(screen.getByRole('button', { name: 'Previous Lesson: Intro' })).toHaveClass(
      '[@media(max-height:32rem)]:h-10',
      '[@media(max-height:32rem)]:w-full',
    );
    expect(screen.getByRole('button', { name: 'Next Lesson: Quiz' })).toHaveClass(
      '[@media(max-height:32rem)]:h-10',
      '[@media(max-height:32rem)]:w-full',
    );
  });

  it('labels desktop curriculum navigation and exposes semantic lesson lists', () => {
    renderSidebar();

    expect(screen.getByRole('navigation', { name: 'Course Content' })).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Welcome/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/Completed, Current lesson/)).toHaveClass('sr-only');
    expect(screen.getAllByText(/Not completed/)).toHaveLength(2);
  });

  it('connects accordion buttons to regions and handles keyboard activation', async () => {
    const { onToggleSection } = renderSidebar({ expandedSectionIds: [10] });
    const toggle = screen.getByRole('button', { name: /Introduction/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'course-section-10-lessons');
    await userEvent.type(toggle, '{enter}');
    expect(onToggleSection).toHaveBeenCalledWith(10);

    const collapsedToggle = screen.getByRole('button', { name: /Practice/ });
    expect(collapsedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Knowledge check/ })).not.toBeInTheDocument();
  });

  it('announces the resulting section state when an accordion is toggled', async () => {
    renderSidebar({ expandedSectionIds: [10] });

    await userEvent.click(screen.getByRole('button', { name: /Introduction/ }));

    expect(screen.getByRole('status')).toHaveTextContent('Introduction collapsed');
  });

  it('renders mobile curriculum as a modal, traps focus, and closes on Escape', async () => {
    const { onClose } = renderSidebar({ isDesktop: false });
    const dialog = screen.getByRole('dialog', { name: 'Course Content' });
    const close = screen.getByRole('button', { name: 'Close course content' });
    const last = screen.getByRole('button', { name: /Knowledge check/ });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass(
      'h-[calc(100dvh-4rem)]',
      'max-w-sm',
      'overflow-hidden',
      'xl:w-80',
      'xl:max-w-none',
    );
    expect(close).toHaveFocus();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
    last.focus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('provides a visible close action inside the mobile curriculum', async () => {
    const { onClose } = renderSidebar({ isDesktop: false });

    await userEvent.click(screen.getByRole('button', { name: 'Close course content' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls lesson selection for keyboard users', async () => {
    const { onSelectLesson } = renderSidebar();
    await userEvent.type(screen.getByRole('button', { name: /Read the guide/ }), '{enter}');
    expect(onSelectLesson).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('focuses and traps the access recovery dialog', async () => {
    const onGoNow = vi.fn();
    render(
      <CourseAccessErrorDialog
        title="Access suspended"
        message="Contact support."
        redirectCountdown={10}
        onGoBack={vi.fn()}
        onGoNow={onGoNow}
      />
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Access suspended' });
    const goNow = screen.getByRole('button', { name: 'Go Now' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(goNow).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onGoNow).toHaveBeenCalledOnce();
  });
});

// ─── Page-level media/content/progress accessibility ──────────────────────────

describe('CoursePlayerPage media/content/progress accessibility', () => {
  it.each(['video', 'text', 'quiz', 'completion', 'save-error'] as const)(
    'has no critical/serious axe violations in the %s state',
    async (state) => {
      if (state === 'save-error') {
        vi.useFakeTimers();
        vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValue(new Error('save failed'));
        const { container } = render(<CoursePlayerPage />);
        await settlePage();
        const video = document.querySelector('video')!;
        fireEvent(video, new Event('timeupdate'));
        await advanceTimersAndFlush(10000);
        vi.useRealTimers();
        expect(screen.getByRole('alert')).toHaveTextContent('Video progress could not be saved.');
        await assertNoSeriousViolations(container);
        return;
      }

      const { container } = await renderPage();
      if (state === 'text') {
        fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
        await screen.findByRole('heading', { level: 2, name: 'Read the guide' });
      }
      if (state === 'quiz') {
        fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
        await screen.findByRole('heading', { level: 2, name: 'Read the guide' });
        fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
        await screen.findByRole('heading', { level: 2, name: 'Knowledge check' });
      }
      if (state === 'completion') {
        currentEnrollment = { ...baseEnrollment, progressPercentage: 100, completedLessons: 3 };
      }
      await assertNoSeriousViolations(container);
    },
  );

  // The post-navigation focus effect leaves focus ON the lesson heading, and
  // VoiceOver activates controls without moving DOM focus — so the next lesson
  // switch would call .focus() on the element that is already activeElement.
  // That is a no-op: no focus event, no AX focus notification, and VoiceOver
  // re-reads the accessible name it had cached (the previous lesson's title).
  // Keying the heading per lesson makes the focus target a fresh node, so
  // focus always genuinely moves.
  it('replaces the lesson heading node on a lesson switch so focus always moves', async () => {
    await renderPage();
    const firstHeading = screen.getByRole('heading', { level: 2, name: 'Watch the video' });
    firstHeading.focus();
    expect(firstHeading).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));

    const secondHeading = await screen.findByRole('heading', { level: 2, name: 'Read the guide' });
    expect(secondHeading).not.toBe(firstHeading);
    expect(firstHeading).not.toBeInTheDocument();
    await waitFor(() => expect(secondHeading).toHaveFocus());
  });

  it('keeps the document title on the current lesson after a lesson switch', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
    await screen.findByRole('heading', { level: 2, name: 'Read the guide' });

    await waitFor(() => expect(document.title).toContain('Read the guide'));
  });

  it('keeps the Mark complete name stable, disabled and aria-busy while completing', async () => {
    let resolveComplete!: (value: LessonProgressResponse) => void;
    vi.mocked(lessonProgressService.completeLesson).mockReturnValue(
      new Promise<LessonProgressResponse>((resolve) => { resolveComplete = resolve; }),
    );
    vi.mocked(lessonProgressService.getEnrollmentProgress)
      .mockResolvedValueOnce([])
      .mockResolvedValue([completedProgress]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    const button = screen.getByRole('button', { name: 'Mark complete' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAccessibleName('Mark complete');

    resolveComplete(completedProgress);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Mark complete' })).not.toBeInTheDocument(),
    );
  });

  it('calls completeLesson once on rapid double activation', async () => {
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue({} as any);
    await renderPage();

    const button = screen.getByRole('button', { name: 'Mark complete' });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(lessonProgressService.completeLesson).toHaveBeenCalledTimes(1));
  });

  it('announces the completed lesson and reconciled percentage', async () => {
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue({} as any);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Go to next lesson now' })).toHaveAccessibleDescription(
        /Watch the video completed\. Course progress is 33%\./,
      );
    });
  });

  it('does not switch lesson before completion succeeds', async () => {
    let resolveComplete!: (value: LessonProgressResponse) => void;
    vi.mocked(lessonProgressService.completeLesson).mockReturnValue(
      new Promise<LessonProgressResponse>((resolve) => { resolveComplete = resolve; }),
    );
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Watch the video' })).toBeInTheDocument();
    expect(screen.queryByText(/Moving to/)).not.toBeInTheDocument();

    resolveComplete(completedProgress);
    await waitFor(() =>
      expect(
        screen.getByText('Lesson completed. Moving to Read the guide in 10 seconds.'),
      ).toBeInTheDocument(),
    );
  });

  it('announces the 10-second auto-advance and supports cancel', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue({} as any);
    render(<CoursePlayerPage />);
    await settlePage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    await settlePage();

    const visualCountdown = screen.getByText(
      'Lesson completed. Moving to Read the guide in 10 seconds.',
    );
    expect(visualCountdown).toBeInTheDocument();
    expect(visualCountdown.closest('[aria-live]')).toBeNull();

    const completeAnnouncement = screen.getByText(
      'Watch the video completed. Course progress is 33%. Moving to Read the guide in 10 seconds. To remain on this lesson, activate Cancel auto-advance.',
    );
    const goNowButton = screen.getByRole('button', { name: 'Go to next lesson now' });
    expect(goNowButton).toHaveAttribute('aria-describedby', completeAnnouncement.id);

    await advanceTimersAndFlush(16);
    expect(goNowButton).toHaveFocus();

    await advanceTimersAndFlush(1000);
    expect(screen.getByText('Lesson completed. Moving to Read the guide in 9 seconds.')).toBeInTheDocument();
    expect(completeAnnouncement).toHaveTextContent('Moving to Read the guide in 10 seconds.');

    expect(goNowButton).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel auto-advance' });
    cancelButton.focus();
    // Keyboard activation of a native button dispatches a click with detail 0.
    fireEvent.click(cancelButton, { detail: 0 });
    await advanceTimersAndFlush(16);
    expect(screen.queryByText(/Moving to/)).not.toBeInTheDocument();
    expect(screen.getByText('Auto-advance cancelled. Staying on the current lesson.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Watch the video' })).toHaveFocus();
  });

  it('clears a stale auto-advance when the user manually navigates', async () => {
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue({} as any);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    await waitFor(() =>
      expect(
        screen.getByText('Lesson completed. Moving to Read the guide in 10 seconds.'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Read the guide' })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Moving to/)).not.toBeInTheDocument();
  });

  it('shows a persistent progress-save error with status, retry name and action', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValue(new Error('save failed'));
    const { container } = render(<CoursePlayerPage />);
    await settlePage();

    const video = document.querySelector('video')!;
    fireEvent(video, new Event('timeupdate'));
    await advanceTimersAndFlush(10000);
    vi.useRealTimers();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Video progress could not be saved. Your latest position may not be available on another device.',
    );
    expect(screen.getByRole('button', { name: 'Retry saving video progress' })).toBeInTheDocument();
  });

  it('retries the latest failed watch-progress payload and clears the error', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValueOnce(new Error('save failed'));
    const { container } = render(<CoursePlayerPage />);
    await settlePage();

    const video = document.querySelector('video')!;
    video.currentTime = 42;
    fireEvent(video, new Event('timeupdate'));
    await advanceTimersAndFlush(10000);
    vi.useRealTimers();

    expect(screen.getByRole('alert')).toBeInTheDocument();

    vi.mocked(lessonProgressService.updateWatchProgress).mockResolvedValue({} as any);
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving video progress' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(lessonProgressService.updateWatchProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ lessonId: 1, lastPosition: 42 }),
    );
  });

  it('renders transcript actions without showing transcript text until requested', async () => {
    const user = userEvent.setup();
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Transcript' })).toBeInTheDocument();
    expect(screen.queryByText('This is the video transcript.')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /Transcript Available for reference/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: 'Download transcript for Watch the video' }),
    ).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Transcript content' })).toBeInTheDocument();
    expect(screen.getByText('This is the video transcript.')).toBeInTheDocument();
  });

  it('renders a transcript placeholder without falsely claiming captions exist', async () => {
    currentLessons = [
      { ...videoLesson, articleContent: null, videoCaptionUrl: null },
      articleLesson,
      quizLesson,
    ];
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Transcript' })).toBeInTheDocument();
    expect(
      screen.getByText('A transcript is not available for this video.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Download transcript/ }),
    ).not.toBeInTheDocument();
  });

  it('renders a completion dialog with status and next actions at 100%', async () => {
    currentEnrollment = { ...baseEnrollment, progressPercentage: 100, completedLessons: 3 };
    await renderPage();

    expect(await screen.findByRole('dialog', { name: 'Course completed' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Course completed' })).toBeInTheDocument();
    expect(screen.getByText('You completed Accessible React.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to My Learning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay and review course' })).toBeInTheDocument();
  });

  // ── F2: retry must resend the exact failed payload ─────────────────────────

  it('retries the exact failed payload after the user switches lessons', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValueOnce(
      new Error('save failed'),
    );
    render(<CoursePlayerPage />);
    await settlePage();

    const video = document.querySelector('video')!;
    video.currentTime = 31;
    fireEvent(video, new Event('timeupdate'));
    await advanceTimersAndFlush(10000);
    vi.useRealTimers();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Retrying progress for "Watch the video".',
    );

    fireEvent.click(screen.getByRole('button', { name: /Next Lesson/ }));
    await screen.findByRole('heading', { level: 2, name: 'Read the guide' });

    vi.mocked(lessonProgressService.updateWatchProgress).mockResolvedValue({} as any);
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving video progress' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(lessonProgressService.updateWatchProgress).toHaveBeenLastCalledWith({
      enrollmentId: 50,
      lessonId: 1,
      lastPosition: 31,
      watchDuration: 31,
    });
  });

  it('does not double-submit a retry while a save is in flight', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValueOnce(
      new Error('save failed'),
    );
    render(<CoursePlayerPage />);
    await settlePage();

    const video = document.querySelector('video')!;
    video.currentTime = 42;
    fireEvent(video, new Event('timeupdate'));
    await advanceTimersAndFlush(10000);
    vi.useRealTimers();

    let resolveSave!: (value: LessonProgressResponse) => void;
    vi.mocked(lessonProgressService.updateWatchProgress).mockReturnValue(
      new Promise<LessonProgressResponse>((resolve) => { resolveSave = resolve; }),
    );
    const retry = screen.getByRole('button', { name: 'Retry saving video progress' });
    fireEvent.click(retry);
    fireEvent.click(retry);

    await waitFor(() => expect(lessonProgressService.updateWatchProgress).toHaveBeenCalledTimes(2));
    resolveSave({} as LessonProgressResponse);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('announces when progress is saved after a retry succeeds', async () => {
    vi.useFakeTimers();
    vi.mocked(lessonProgressService.updateWatchProgress).mockRejectedValueOnce(
      new Error('save failed'),
    );
    const { container } = render(<CoursePlayerPage />);
    await settlePage();

    const video = document.querySelector('video')!;
    video.currentTime = 42;
    fireEvent(video, new Event('timeupdate'));
    await advanceTimersAndFlush(10000);
    vi.useRealTimers();

    vi.mocked(lessonProgressService.updateWatchProgress).mockResolvedValue({} as any);
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving video progress' }));

    await waitFor(() =>
      expect(container.querySelector('.sr-only')).toHaveTextContent('Progress saved'),
    );
  });

  // ── F1: optimistic progress vs. server-confirmed completion ────────────────

  it('does not render or announce course completion while the last-lesson request is pending', async () => {
    currentLessons = [videoLesson];
    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: 1,
    };
    let resolveComplete!: (value: LessonProgressResponse) => void;
    vi.mocked(lessonProgressService.completeLesson).mockReturnValue(
      new Promise<LessonProgressResponse>((resolve) => { resolveComplete = resolve; }),
    );
    const { container } = await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    expect(screen.queryByRole('heading', { name: 'Course completed' })).not.toBeInTheDocument();
    expect(screen.queryByText('You completed Accessible React.')).not.toBeInTheDocument();
    expect(container.querySelector('.sr-only')).not.toHaveTextContent('completed');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    resolveComplete(completedProgress);
  });

  it('shows the completion dialog, focuses its heading and announces new progress when the last lesson completes', async () => {
    currentLessons = [videoLesson];
    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: 1,
    };
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue(completedProgress);
    vi.mocked(lessonProgressService.getEnrollmentProgress)
      .mockResolvedValueOnce([])
      .mockResolvedValue([completedProgress]);
    const { container } = await renderPage();

    // The server-reported enrollment reaches 100% only during reconciliation,
    // after the initial load already used the 0% enrollment above.
    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 100,
      completedLessons: 1,
      totalLessons: 1,
    };

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    const heading = await screen.findByRole('heading', { name: 'Course completed' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByText('Watch the video completed. Course progress is 100%.')).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('rolls back progress and keeps focus on Mark complete when the last-lesson request fails', async () => {
    currentLessons = [videoLesson];
    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: 1,
    };
    vi.mocked(lessonProgressService.completeLesson).mockRejectedValue(new Error('server down'));
    const { container } = await renderPage();

    const button = screen.getByRole('button', { name: 'Mark complete' });
    button.focus();
    fireEvent.click(button);

    await screen.findByRole('alert');
    expect(screen.queryByRole('heading', { name: 'Course completed' })).not.toBeInTheDocument();
    expect(container.querySelector('.sr-only')).not.toHaveTextContent('completed');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: 'Retry marking lesson complete' })).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mark complete' })),
    );
  });

  it('opens completion once for a completed course and returns focus to the lesson when dismissed', async () => {
    currentEnrollment = { ...baseEnrollment, progressPercentage: 100, completedLessons: 3 };
    const { container } = await renderPage();

    const dialog = await screen.findByRole('dialog', { name: 'Course completed' });
    const heading = await screen.findByRole('heading', { name: 'Course completed' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('You completed Accessible React.')).toBeInTheDocument();
    await waitFor(() => expect(heading).toHaveFocus());

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Course completed' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Watch the video' })).toHaveFocus(),
    );
    await assertNoSeriousViolations(container);
  });

  it('offers a reconciliation-only retry when completion succeeds but progress refresh fails', async () => {
    currentLessons = [videoLesson];
    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: 1,
    };
    vi.mocked(lessonProgressService.completeLesson).mockResolvedValue(completedProgress);
    vi.mocked(lessonProgressService.getEnrollmentProgress)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValueOnce([completedProgress]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'The lesson was completed, but course progress could not be refreshed.',
    );
    expect(screen.queryByRole('heading', { name: 'Course completed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark complete' })).not.toBeInTheDocument();

    currentEnrollment = {
      ...baseEnrollment,
      progressPercentage: 100,
      completedLessons: 1,
      totalLessons: 1,
    };
    fireEvent.click(screen.getByRole('button', { name: 'Retry refreshing course progress' }));

    await screen.findByRole('heading', { name: 'Course completed' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(lessonProgressService.completeLesson).toHaveBeenCalledTimes(1);
    expect(lessonProgressService.getEnrollmentProgress).toHaveBeenCalledTimes(3);
  });

  // ── F3: caption HTTP failures at the page level ────────────────────────────

  it('surfaces an accessible caption failure when the caption URL returns 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        blob: () => Promise.resolve(new Blob(['WEBVTT'])),
      }),
    );
    const { container } = await renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Captions could not be loaded for this video.'),
      ).toBeInTheDocument();
    });
    expect(container.querySelector('track')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Captions' })).not.toBeInTheDocument();
    await assertNoSeriousViolations(container);
  });
});
