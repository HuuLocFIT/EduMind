import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ContentType, EnrollmentStatus } from '@edumind/shared-constants';
import type {
  CourseDetailResponse,
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { CoursePlayerBoot } from './CoursePlayerBoot';
import { CoursePlayerPage } from './CoursePlayerPage';

// Regression test for the "skeleton flashes off then back on" bug: the route
// used to own a Suspense fallback skeleton (torn down once the chunk loaded)
// while CoursePlayerPage separately mounted its own fresh skeleton while
// fetching data -- two different DOM nodes for what should be one continuous
// loading state. CoursePlayerBoot fixes that by being the single owner; this
// test renders the real route shape (lazy chunk + Suspense + Boot, in
// StrictMode) with controllable promises for both the chunk load and every
// data fetch, and asserts the skeleton root DOM node never changes identity
// until real content is ready.

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
  enrollmentService: { getMyEnrollmentForCourse: vi.fn() },
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
  InlineQuizTaker: () => null,
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

const sections = [{ id: 10, title: 'Introduction', orderIndex: 0 }] as SectionResponse[];

const course = {
  id: 100,
  title: 'Handoff Course',
  slug: 'handoff-course',
} as CourseDetailResponse;

const lesson = {
  id: 1,
  sectionId: 10,
  title: 'Intro lesson',
  contentType: ContentType.VIDEO,
  orderIndex: 0,
} as LessonResponse;

const enrollment = {
  id: 50,
  courseId: 100,
  courseTitle: 'Handoff Course',
  courseSlug: 'handoff-course',
  studentId: 7,
  status: EnrollmentStatus.ACTIVE,
  progressPercentage: 0,
  completedLessons: 0,
  totalLessons: 1,
  enrolledAt: '2026-01-01T00:00:00.000Z',
} as EnrollmentResponse;

// CoursePlayerPage renders its own "Loading course player" status text
// whenever *its* internal `loading` is true, even while mounted-but-hidden
// under CoursePlayerBoot's `<div hidden>` wrapper (needed so its effects run
// from the first frame -- see CoursePlayerBoot.tsx). That inert copy isn't
// exposed to assistive tech, so only count status text outside any `hidden`
// ancestor when asserting there is exactly one live announcement.
function visibleLoadingStatusNodes() {
  return screen
    .queryAllByText('Loading course player', { selector: '[role="status"]' })
    .filter((el) => !el.closest('[hidden]'));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('CoursePlayerBoot + CoursePlayerPage loading handoff', () => {
  it('keeps a single skeleton root across the chunk-load -> data-load handoff, with no double flash', async () => {
    const courseGate = createDeferred<CourseDetailResponse>();
    const sectionsGate = createDeferred<SectionResponse[]>();
    const lessonsGate = createDeferred<LessonResponse[]>();
    const enrollmentGate = createDeferred<EnrollmentResponse>();
    const progressGate = createDeferred<LessonProgressResponse[]>();

    // Every mock returns the *same* promise instance on every call so a
    // StrictMode double-effect-invocation (which this test deliberately
    // exercises) still converges when the gate resolves once.
    vi.mocked(courseService.getCourseBySlug).mockImplementation(() => courseGate.promise);
    vi.mocked(sectionService.getCourseSections).mockImplementation(() => sectionsGate.promise);
    vi.mocked(lessonService.getCourseLessons).mockImplementation(() => lessonsGate.promise);
    vi.mocked(enrollmentService.getMyEnrollmentForCourse).mockImplementation(
      () => enrollmentGate.promise
    );
    vi.mocked(lessonProgressService.getEnrollmentProgress).mockImplementation(
      () => progressGate.promise
    );
    vi.mocked(lessonProgressService.startLesson).mockResolvedValue(
      {} as LessonProgressResponse
    );
    vi.mocked(aiService.getQuizForStudent).mockResolvedValue(null);

    const chunkGate = createDeferred<void>();
    const LazyCoursePlayerPage = React.lazy(async () => {
      await chunkGate.promise;
      return { default: CoursePlayerPage };
    });

    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/learning/handoff-course']}>
          <Routes>
            <Route
              path="/learning/:courseSlug"
              element={
                <CoursePlayerBoot>
                  <React.Suspense fallback={null}>
                    <LazyCoursePlayerPage />
                  </React.Suspense>
                </CoursePlayerBoot>
              }
            />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>
    );

    // 1. Before the lazy chunk resolves: exactly one skeleton root, one
    // "Loading course player" status node, one <title>.
    const initialSkeletonRoot = document.querySelector('[aria-busy="true"]');
    expect(initialSkeletonRoot).not.toBeNull();
    expect(visibleLoadingStatusNodes()).toHaveLength(1);
    expect(document.title).toBe('Course Player | EduMind');

    // 2. Resolve the chunk: CoursePlayerPage mounts (hidden) and starts
    // fetching. The skeleton root must be the *same* DOM node -- this is the
    // regression this test guards against: previously the route-level
    // Suspense fallback skeleton was torn down here and CoursePlayerPage
    // mounted a second, freshly-built skeleton in its place.
    await act(async () => {
      chunkGate.resolve();
      await chunkGate.promise;
    });

    expect(document.querySelector('[aria-busy="true"]')).toBe(initialSkeletonRoot);
    expect(visibleLoadingStatusNodes()).toHaveLength(1);
    expect(document.title).toBe('Course Player | EduMind');

    // 3. Resolve the course-by-slug call -- still the same skeleton root.
    await act(async () => {
      courseGate.resolve(course);
      await courseGate.promise;
    });
    expect(document.querySelector('[aria-busy="true"]')).toBe(initialSkeletonRoot);

    // 4. Resolve sections/lessons/enrollment/progress -> loading flips false,
    // Boot's one-way `ready` latch flips, the skeleton unmounts, and real
    // content appears -- with no second skeleton flash in between.
    await act(async () => {
      sectionsGate.resolve(sections);
      lessonsGate.resolve([lesson]);
      enrollmentGate.resolve(enrollment);
      progressGate.resolve([]);
      await Promise.all([
        sectionsGate.promise,
        lessonsGate.promise,
        enrollmentGate.promise,
        progressGate.promise,
      ]);
    });

    await waitFor(() => {
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    });

    expect(visibleLoadingStatusNodes()).toHaveLength(0);
    expect(document.title).toBe('Intro lesson | EduMind');
    expect(await screen.findByText('Handoff Course')).toBeInTheDocument();
  });
});
