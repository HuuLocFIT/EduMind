import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArticleViewer } from '../../../components/learning/ArticleViewer';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  ProgressBar,
  useModal,
} from '@edumind/user-ui';
import { CoursePlayerSkeleton } from '../../../components/route-skeletons/CoursePlayerSkeleton';
import { courseService } from '../../../services/course.service';
import { enrollmentService } from '../../../services/enrollment.service';
import { lessonProgressService } from '../../../services/lesson-progress.service';
import { lessonService } from '../../../services/lesson.service';
import { sectionService } from '../../../services/section.service';
import { aiService } from '../../../services/ai.service';
import type {
  CourseDetailResponse,
  LessonResponse,
  LessonProgressResponse,
  EnrollmentResponse,
  SectionResponse,
  UpdateProgressRequest,
} from '@edumind/shared-types';
import { ContentType, EnrollmentStatus } from '@edumind/shared-constants';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  List,
  X,
  Sparkles,
  Download,
  Loader2,
} from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import { queryKeys } from '../../../lib/query-keys';
import { VideoPlayer } from '../../../components/learning/VideoPlayer';
import { QuizTakerModal } from '../../../components/learning/QuizTakerModal';
import { LessonSummaryPanel } from '../../../components/learning/LessonSummaryPanel';
import { InlineQuizTaker } from '../../../components/learning/InlineQuizTaker';
import { CourseCurriculumSidebar } from './components/CourseCurriculumSidebar';
import { CourseAccessErrorDialog } from './components/CourseAccessErrorDialog';
import { CourseCompletionDialog } from './components/CourseCompletionDialog';
const AiChatPanel = React.lazy(() =>
  import('../../../components/learning/AiChatPanel').then((m) => ({ default: m.AiChatPanel }))
);
import { useAiChatStore } from '../../../stores/aiChat.store';
import type {
  AccessError,
  AutoAdvanceState,
  CompletionError,
  CompletionSource,
  LessonClickOptions,
  ProgressSaveError,
} from './course-player.types';
import {
  buildCourseAccessError,
  calculateOptimisticCourseProgress,
  findLessonProgress,
  getAdjacentLessons,
  htmlToPlainText,
  isCourseCompleteFromEnrollment,
  resolveInitialLesson,
  sortCourseLessons,
} from './course-player.utils';

export const CoursePlayerPage: React.FC = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quizModal = useModal();
  const { isOpen: isChatOpen, closeChat, toggleChat } = useAiChatStore();
  const queryClient = useQueryClient();

  const REDIRECT_DELAY_SECONDS = 10;
  const AUTO_ADVANCE_SECONDS = 5;

  // State
  const [resolvedCourseId, setResolvedCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [expandedSectionIds, setExpandedSectionIds] = useState<number[]>([]);
  // All progress for this enrollment; derive per-lesson progress from here
  const [allLessonProgress, setAllLessonProgress] = useState<LessonProgressResponse[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  // null = still checking, true/false = resolved
  const [lessonHasQuiz, setLessonHasQuiz] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<AccessError | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [lessonAnnouncement, setLessonAnnouncement] = useState('');
  // Server-confirmed course completion. Optimistic enrollment updates never set
  // this, so the completion dialog only appears once the server confirms it.
  const [confirmedCourseComplete, setConfirmedCourseComplete] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  // Progress autosave orchestration
  const [progressSaveState, setProgressSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [progressSaveError, setProgressSaveError] = useState<ProgressSaveError | null>(null);
  const latestProgressPayloadRef = useRef<UpdateProgressRequest | null>(null);
  const progressSaveInFlightRef = useRef(false);

  // Completion orchestration
  const [completingLessonId, setCompletingLessonId] = useState<number | null>(null);
  const completingLessonRef = useRef<number | null>(null);
  const [completionError, setCompletionError] = useState<CompletionError | null>(null);
  const [completionReconcileError, setCompletionReconcileError] = useState<CompletionError | null>(
    null
  );
  const [completionReconcileInFlight, setCompletionReconcileInFlight] = useState(false);
  const completionReconcileInFlightRef = useRef(false);
  const [completionAnnouncement, setCompletionAnnouncement] = useState('');
  const [autoAdvance, setAutoAdvance] = useState<AutoAdvanceState | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeLessonRef = useRef<HTMLButtonElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const skipSidebarScroll = useRef(false);
  const reconcileVersionRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonHeadingRef = useRef<HTMLHeadingElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const pendingLessonFocusRef = useRef(false);
  const completionModalShownRef = useRef(false);
  const completionControlsRef = useRef<HTMLDivElement>(null);

  // Live values for the autosave interval so it never reads a stale closure.
  const currentLessonRef = useRef<LessonResponse | null>(null);
  const enrollmentRef = useRef<EnrollmentResponse | null>(null);

  useEffect(() => {
    currentLessonRef.current = currentLesson;
  }, [currentLesson]);

  useEffect(() => {
    enrollmentRef.current = enrollment;
  }, [enrollment]);

  useEffect(() => {
    completionModalShownRef.current = false;
    setCompletionModalOpen(false);
  }, [courseSlug]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (courseSlug) {
      fetchCourseData(signal);
    }

    return () => {
      abortControllerRef.current?.abort();
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
      if (autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
        autoAdvanceIntervalRef.current = null;
      }
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = null;
      }
    };
  }, [courseSlug]);

  useEffect(() => {
    if (currentLesson && enrollment) {
      updateLastAccessedLesson();
    }
  }, [currentLesson, enrollment]);

  useEffect(() => {
    if (!currentLesson) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentLesson?.id]);

  useEffect(() => {
    if (!currentLesson || !pendingLessonFocusRef.current) return;

    const frame = requestAnimationFrame(() => {
      lessonHeadingRef.current?.focus();
      pendingLessonFocusRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [currentLesson?.id, sidebarOpen]);

  // Scroll active lesson into view inside the sidebar scroll container
  useLayoutEffect(() => {
    if (!currentLesson || !sidebarOpen) return;
    if (skipSidebarScroll.current) {
      skipSidebarScroll.current = false;
      return;
    }
    const container = sidebarScrollRef.current;
    const item = activeLessonRef.current;
    if (!container || !item) return;

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;

    if (itemTop < containerTop || itemBottom > containerBottom) {
      container.scrollTop = itemTop - container.clientHeight / 2 + item.offsetHeight / 2;
    }
  }, [currentLesson?.id, sidebarOpen]);

  // Check whether the current lesson has a generated quiz available for the student
  useEffect(() => {
    if (!currentLesson || currentLesson.contentType === ContentType.QUIZ) return;
    let isSubscribed = true;

    aiService
      .getQuizForStudent(currentLesson.id)
      .then((quiz) => {
        if (isSubscribed) {
          setLessonHasQuiz(quiz !== null);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setLessonHasQuiz(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentLesson?.id]);


  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    if (mediaQuery.matches) {
      setSidebarOpen(true);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    }
  }, [isDesktop]);

  // Handle countdown and auto-redirect when accessError is shown
  useEffect(() => {
    if (!accessError) return;

    setRedirectCountdown(REDIRECT_DELAY_SECONDS);

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(accessError.redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [accessError, navigate]);


  const fetchCourseData = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      if (signal?.aborted) return;

      // Resolve course by slug
      const courseData = await courseService.getCourseBySlug(courseSlug!);
      const numericCourseId = courseData.id;
      setResolvedCourseId(numericCourseId);

      if (signal?.aborted) return;

      // Fetch sections and lessons with resolved numeric ID
      const [courseSections, courseLessons] = await Promise.all([
        sectionService.getCourseSections(numericCourseId),
        lessonService.getCourseLessons(numericCourseId),
      ]);

      if (signal?.aborted) return;
      
      setCourse(courseData);
      setSections(courseSections);
      setExpandedSectionIds(courseSections.map((s) => s.id));
      
      // Sort lessons by section order and lesson order
      const sortedLessons = sortCourseLessons(courseSections, courseLessons);

      if (signal?.aborted) return;

      setLessons(sortedLessons);

      // Restore last lesson or default to first if available
      if (sortedLessons.length > 0) {
        const lessonIdParam = searchParams.get('lesson') || searchParams.get('lessonId');
        const lastLessonId = localStorage.getItem(`course_${courseSlug}_last_lesson`);

        const targetLesson = resolveInitialLesson(sortedLessons, lessonIdParam, lastLessonId)!;

        setCurrentLesson(targetLesson);
        setSearchParams({ lesson: targetLesson.id.toString(), type: targetLesson.contentType }, { replace: true });
        localStorage.setItem(`course_${courseSlug}_last_lesson`, targetLesson.id.toString());
        localStorage.setItem(`course_${courseSlug}_last_lesson_type`, targetLesson.contentType);
        localStorage.setItem(`lesson_${targetLesson.id}_type`, targetLesson.contentType);
      }

      if (signal?.aborted) return;

      // Check enrollment after we have the resolved course ID
      await checkEnrollment(numericCourseId, signal);
    } catch (err) {
      console.error('Error fetching course data:', err);
      if (signal?.aborted) return;
      setLessons([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const checkEnrollment = async (courseId: number, signal?: AbortSignal) => {
    try {
      if (signal?.aborted) return;
      const isEnrolled = await enrollmentService.checkEnrollmentStatus(courseId);
      if (signal?.aborted) return;
      if (!isEnrolled) {
        setAccessError(buildCourseAccessError('NOT_ENROLLED', courseSlug!));
        return;
      }
      
      // Get enrollment details
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      if (signal?.aborted) return;
      const foundEnrollment = response.data?.find(
        (e) => e.courseId === courseId
      );
      if (foundEnrollment) {
        // Business rules:
        // - DROPPED: treat as not enrolled -> redirect to course detail / purchase.
        // - SUSPENDED: student still "owns" the course but access is forbidden.
        if (foundEnrollment.status === EnrollmentStatus.DROPPED) {
          setAccessError(buildCourseAccessError(EnrollmentStatus.DROPPED, courseSlug!));
          return;
        }

        if (foundEnrollment.status === EnrollmentStatus.SUSPENDED) {
          setAccessError(buildCourseAccessError(EnrollmentStatus.SUSPENDED, courseSlug!));
          return;
        }

        setEnrollment(foundEnrollment);
        const completeAtLoad = isCourseCompleteFromEnrollment(foundEnrollment);
        setConfirmedCourseComplete(completeAtLoad);
        // Load all lesson progress for this enrollment once
        try {
          const allProgress = await lessonProgressService.getEnrollmentProgress(
            foundEnrollment.id
          );
          setAllLessonProgress(allProgress);
        } catch (progressErr) {
          console.error('Error loading lesson progress:', progressErr);
          setAllLessonProgress([]);
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error checking enrollment:', err);
      setAccessError({
        title: 'Unable to load course',
        message:
          'We were unable to verify your enrollment for this course. Please try again or go back to the course page.',
        redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
          courseSlug: courseSlug!,
        }),
      });
    }
  };

  // Helper: get progress for a specific lesson
  const getLessonProgress = (lessonId: number): LessonProgressResponse | null => {
    return findLessonProgress(allLessonProgress, lessonId);
  };

  // Derived progress for the current lesson
  const currentLessonProgress: LessonProgressResponse | null =
    currentLesson ? getLessonProgress(currentLesson.id) : null;

  // When current lesson or all progress changes, sync video progress percentage
  useEffect(() => {
    if (!currentLesson) return;
    if (currentLessonProgress) {
      setVideoProgress(currentLessonProgress.watchPercentage || 0);
      } else {
      setVideoProgress(0);
    }
  }, [currentLesson, currentLessonProgress]);

  const updateLastAccessedLesson = async () => {
    if (!currentLesson || !enrollment) return;
    
    try {
      // Start lesson if not started yet
      await lessonProgressService.startLesson(enrollment.id, currentLesson.id);
    } catch (err) {
      // Lesson might already be started, that's okay
      console.log('Lesson already started or error:', err);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !currentLesson || !enrollment) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (!duration || Number.isNaN(duration)) return;

    const progress = (currentTime / duration) * 100;

    setVideoProgress(progress);

    // Auto-save progress every 10 seconds. The interval reads live refs so it
    // never persists a stale payload or a stale lesson/enrollment.
    if (!progressUpdateInterval.current) {
      progressUpdateInterval.current = setInterval(() => {
        void performProgressSave();
      }, 10000);
    }
  };

  // Persist an exact progress payload and reconcile the lesson that the payload
  // belongs to (not necessarily the current lesson). A failed payload is kept in
  // latestProgressPayloadRef so Retry can resend the exact request, even if the
  // user has since navigated to another lesson or moved the playhead.
  const saveProgressPayload = async (payload: UpdateProgressRequest) => {
    if (progressSaveInFlightRef.current) return;
    // Never overwrite a payload whose failure is still shown to the user.
    if (latestProgressPayloadRef.current && latestProgressPayloadRef.current !== payload) return;

    latestProgressPayloadRef.current = payload;
    progressSaveInFlightRef.current = true;
    setProgressSaveState('saving');

    try {
      const saved = await lessonProgressService.updateWatchProgress(payload);
      if (latestProgressPayloadRef.current === payload) {
        latestProgressPayloadRef.current = null;
      }
      setAllLessonProgress((prev) => {
        const existing = prev.find((p) => p.lessonId === payload.lessonId);
        if (!existing) return [...prev, saved];
        return prev.map((p) => (p.lessonId === payload.lessonId ? saved : p));
      });
      setProgressSaveState('idle');
      setProgressSaveError(null);
      setLessonAnnouncement('Progress saved');
    } catch (err) {
      console.error('Error saving progress:', err);
      setProgressSaveState('error');
      const failedLesson = lessons.find((l) => l.id === payload.lessonId);
      setProgressSaveError({
        message:
          'Video progress could not be saved. Your latest position may not be available on another device.' +
          (failedLesson ? ` Retrying progress for "${failedLesson.title}".` : ''),
        retry: () => retryProgressSave(),
      });
    } finally {
      progressSaveInFlightRef.current = false;
    }
  };

  // Build the payload from the latest video position and persist it. Skipped
  // while a failed payload awaits user action so the pending retry is never
  // clobbered by a fresh autosave.
  const performProgressSave = async () => {
    if (progressSaveInFlightRef.current) return;
    if (latestProgressPayloadRef.current) return;

    const lesson = currentLessonRef.current;
    const enrollmentId = enrollmentRef.current?.id;
    const video = videoRef.current;
    if (!lesson || !enrollmentId || !video) return;

    const lastPosition = Math.floor(video.currentTime);
    const payload: UpdateProgressRequest = {
      enrollmentId,
      lessonId: lesson.id,
      lastPosition,
      watchDuration: lastPosition,
    };
    await saveProgressPayload(payload);
  };

  // Resend the exact payload that failed, regardless of the current lesson or
  // playhead position.
  const retryProgressSave = async () => {
    const payload = latestProgressPayloadRef.current;
    if (!payload) return;
    await saveProgressPayload(payload);
  };

  // Seek video to last watched position when metadata is loaded
  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current || !currentLessonProgress) return;
    if (currentLessonProgress.lastPosition && currentLessonProgress.lastPosition > 0) {
      videoRef.current.currentTime = currentLessonProgress.lastPosition;
    }
  };

  // Fallback: if progress arrives after video metadata, still seek to lastPosition
  useEffect(() => {
    if (!videoRef.current || !currentLessonProgress) return;
    if (
      currentLessonProgress.lastPosition &&
      currentLessonProgress.lastPosition > 0 &&
      Math.floor(videoRef.current.currentTime) === 0
    ) {
      videoRef.current.currentTime = currentLessonProgress.lastPosition;
    }
  }, [currentLessonProgress]);

  // Optimistically mark a lesson complete in local state so the UI updates
  // instantly (zero-latency). Returns a snapshot so callers can roll back if
  // the server call ultimately fails.
  const markLessonCompletedLocally = (lessonId: number) => {
    const prevProgress = allLessonProgress;
    const prevEnrollment = enrollment;
    const alreadyCompleted = allLessonProgress.find(
      (p) => p.lessonId === lessonId
    )?.isCompleted;

    setAllLessonProgress((prev) => {
      const existing = prev.find((p) => p.lessonId === lessonId);
      if (!existing) {
        return [
          ...prev,
          {
            lessonId,
            isCompleted: true,
            watchPercentage: 100,
          } as LessonProgressResponse,
        ];
      }
      return prev.map((p) =>
        p.lessonId === lessonId ? { ...p, isCompleted: true } : p
      );
    });

    // Bump the course progress bar optimistically (only when newly completed)
    if (!alreadyCompleted && enrollment) {
      const { completedLessons: newCompleted, progressPercentage } =
        calculateOptimisticCourseProgress(enrollment, lessons.length);
      setEnrollment({
        ...enrollment,
        completedLessons: newCompleted,
        progressPercentage,
      });
    }

    return { prevProgress, prevEnrollment };
  };

  // Reconcile the optimistic local state with the server truth in the
  // background, then refresh cross-page caches.
  const reconcileEnrollmentProgress = async (enrollmentId: number) => {
    const version = ++reconcileVersionRef.current;
    try {
      const [allProgress, response] = await Promise.all([
        lessonProgressService.getEnrollmentProgress(enrollmentId),
        enrollmentService.getMyEnrollments({ page: 0, size: 100 }),
      ]);
      if (version !== reconcileVersionRef.current) return;
      setAllLessonProgress(allProgress);
      const found = response.data?.find((e) => resolvedCourseId !== null && e.courseId === resolvedCourseId);
      if (!found) {
        throw new Error('The updated enrollment could not be loaded.');
      }
      setEnrollment(found);
      setConfirmedCourseComplete(isCourseCompleteFromEnrollment(found));
    } finally {
      // Invalidate enrollment cache so MyLearningPage shows fresh data on next visit.
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    }
  };

  const retryCompletionReconciliation = async (enrollmentId: number) => {
    if (completionReconcileInFlightRef.current) return;

    completionReconcileInFlightRef.current = true;
    setCompletionReconcileInFlight(true);
    setCompletionReconcileError(null);
    try {
      await reconcileEnrollmentProgress(enrollmentId);
      setCompletionAnnouncement('Course progress updated.');
    } catch (err) {
      console.error('Error reconciling lesson progress:', err);
      setCompletionReconcileError({
        message: 'The lesson was completed, but course progress could not be refreshed.',
        retry: () => retryCompletionReconciliation(enrollmentId),
      });
    } finally {
      completionReconcileInFlightRef.current = false;
      setCompletionReconcileInFlight(false);
    }
  };

  // ── Auto-advance countdown ──────────────────────────────────────────────────

  const clearAutoAdvance = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current);
      autoAdvanceIntervalRef.current = null;
    }
    setAutoAdvance(null);
  };

  const startAutoAdvance = (nextLesson: LessonResponse) => {
    clearAutoAdvance();
    setAutoAdvance({ nextLesson, secondsRemaining: AUTO_ADVANCE_SECONDS });

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      clearAutoAdvance();
      handleLessonClick(nextLesson, { focusContent: true, closeMobileSidebar: !isDesktop });
    }, AUTO_ADVANCE_SECONDS * 1000);

    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvance((prev) =>
        prev && prev.secondsRemaining > 1
          ? { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
          : prev
      );
    }, 1000);
  };

  const cancelAutoAdvance = () => {
    clearAutoAdvance();
    // Keep the user on the current lesson and restore focus to its content.
    requestAnimationFrame(() => {
      lessonHeadingRef.current?.focus();
    });
  };

  // Single completion path for manual, video-ended and quiz-pass so progress
  // updates, announcements, rollback and auto-advance stay consistent.
  const completeCurrentLesson = async (source: CompletionSource) => {
    if (!currentLesson || !enrollment) return;

    const lessonId = currentLesson.id;
    const enrollmentId = enrollment.id;

    if (getLessonProgress(lessonId)?.isCompleted) return;
    // Synchronous guard prevents a double-submit on rapid double activation.
    if (completingLessonRef.current !== null) return;

    clearAutoAdvance();

    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }

    completingLessonRef.current = lessonId;
    setCompletingLessonId(lessonId);
    setCompletionError(null);
    setCompletionReconcileError(null);

    const snapshot = markLessonCompletedLocally(lessonId);

    try {
      await lessonProgressService.completeLesson(enrollmentId, lessonId);

      try {
        await reconcileEnrollmentProgress(enrollmentId);
      } catch (err) {
        console.error('Error reconciling lesson progress:', err);
        setCompletionReconcileError({
          message: 'The lesson was completed, but course progress could not be refreshed.',
          retry: () => retryCompletionReconciliation(enrollmentId),
        });
      }

      const nextLesson = getNextLesson();
      const { progressPercentage } = calculateOptimisticCourseProgress(enrollment, lessons.length);
      const pct = progressPercentage ?? 0;

      setCompletionAnnouncement(
        `${currentLesson.title} completed. Course progress is ${pct}%.`,
      );

      if (!nextLesson) {
        // Course completed: no auto-advance. The completion heading is focused
        // once confirmedCourseComplete flips to true after reconciliation.
      } else {
        startAutoAdvance(nextLesson);
      }
    } catch (err: any) {
      console.error('Error completing lesson:', err);
      // Roll back optimistic completion and keep the current lesson.
      setAllLessonProgress(snapshot.prevProgress);
      if (snapshot.prevEnrollment) setEnrollment(snapshot.prevEnrollment);
      setCompletionError({
        message: err?.message || 'Failed to mark lesson as complete',
        retry: () => completeCurrentLesson(source),
      });
      // Keep keyboard focus on Mark complete (when it still exists) instead of
      // letting it fall back to the page body after the optimistic rollback.
      requestAnimationFrame(() => {
        completionControlsRef.current
          ?.querySelector<HTMLButtonElement>('[aria-label="Mark complete"]')
          ?.focus();
      });
    } finally {
      completingLessonRef.current = null;
      setCompletingLessonId(null);
    }
  };

  const handleVideoEnded = () => {
    if (!currentLesson || !enrollment) return;
    void completeCurrentLesson('video');
  };

  const handleMarkComplete = () => {
    if (!currentLesson || !enrollment) return;
    void completeCurrentLesson('manual');
  };

  const handleQuizPass = () => {
    if (!currentLesson || !enrollment) return;
    void completeCurrentLesson('quiz');
  };

  // Open the completion experience once per course-player session. Subsequent
  // reconciliation or lesson navigation must not reopen a dialog the user has
  // intentionally dismissed.
  useEffect(() => {
    if (confirmedCourseComplete && !completionModalShownRef.current) {
      completionModalShownRef.current = true;
      setCompletionModalOpen(true);
    }
  }, [confirmedCourseComplete]);

  const closeCompletionModal = () => {
    setCompletionModalOpen(false);
    requestAnimationFrame(() => lessonHeadingRef.current?.focus());
  };

  const handleLessonClick = (
    lesson: LessonResponse,
    options: LessonClickOptions = {}
  ) => {
    const isCurrentLesson = currentLesson?.id === lesson.id;

    // Any manual navigation cancels a pending auto-advance timer.
    clearAutoAdvance();

    // Stop current video
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset position so new lesson does not inherit previous time
      videoRef.current.currentTime = 0;
    }

    // Clear progress interval
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }

    pendingLessonFocusRef.current = options.focusContent ?? true;
    setCurrentLesson(lesson);
    setSearchParams({ lesson: lesson.id.toString(), type: lesson.contentType }, { replace: true });
    localStorage.setItem(`course_${courseSlug}_last_lesson`, lesson.id.toString());
    localStorage.setItem(`course_${courseSlug}_last_lesson_type`, lesson.contentType);
    localStorage.setItem(`lesson_${lesson.id}_type`, lesson.contentType);
    const savedProgress = allLessonProgress.find((p) => p.lessonId === lesson.id);
    setVideoProgress(savedProgress?.watchPercentage ?? 0);
    setLessonHasQuiz(null);
    setLessonAnnouncement(`Opened lesson: ${lesson.title}`);
    setCompletionAnnouncement('');
    if (options.closeMobileSidebar) {
      setSidebarOpen(false);
    } else if (isCurrentLesson && pendingLessonFocusRef.current) {
      requestAnimationFrame(() => {
        lessonHeadingRef.current?.focus();
        pendingLessonFocusRef.current = false;
      });
    }
  };

  const getNextLesson = (): LessonResponse | null =>
    getAdjacentLessons(lessons, currentLesson?.id).next;

  const getPreviousLesson = (): LessonResponse | null =>
    getAdjacentLessons(lessons, currentLesson?.id).previous;

  const handleNavigate = (direction: 'next' | 'previous') => {
    const lesson = direction === 'next' ? getNextLesson() : getPreviousLesson();
    if (lesson) {
      handleLessonClick(lesson, { focusContent: true, closeMobileSidebar: !isDesktop });
    }
  };

  const handleDownloadTranscript = () => {
    const html = currentLesson?.articleContent ?? '';
    const plain = htmlToPlainText(html);
    const blob = new Blob([plain], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentLesson?.title ?? 'transcript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  if (loading) {
    return <CoursePlayerSkeleton />;
  }

  // Access error modal – shown when user is DROPPED/SUSPENDED or not properly enrolled
  if (accessError) {
    return (
      <CourseAccessErrorDialog
        title={accessError.title}
        message={accessError.message}
        redirectCountdown={redirectCountdown}
        onGoBack={() => navigate(-1)}
        onGoNow={() => navigate(accessError.redirectTo)}
      />
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Course not found</p>
          <Button variant="primary" onClick={() => navigate(USER_ROUTES.LEARNING)}>
            Back to My Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-16 z-20">
        <div className="px-3 sm:px-4 py-3 grid grid-cols-[3rem_1fr_3rem] xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate(USER_ROUTES.LEARNING)}
            className="h-12 w-12 xl:h-auto xl:w-auto p-0 xl:px-4 xl:py-2 justify-center bg-gray-700 hover:bg-gray-600"
            aria-label="Exit course player and return to My Learning"
          >
            <ChevronLeft aria-hidden="true" className="w-5 h-5" />
            <span className="hidden xl:inline">Exit</span>
          </Button>

          <h1 className="text-white font-semibold text-center xl:text-left truncate px-1 xl:px-0">
            {course.title}
          </h1>

          <button
            ref={sidebarToggleRef}
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-12 w-12 p-0 inline-flex xl:hidden items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={sidebarOpen ? 'Close course content' : 'Open course content'}
            aria-expanded={sidebarOpen}
            aria-controls="course-curriculum-drawer"
          >
            {sidebarOpen ? <X aria-hidden="true" className="w-5 h-5" /> : <List aria-hidden="true" className="w-5 h-5" />}
          </button>

          <div className="hidden xl:flex items-center gap-3">
            <span className="text-gray-300 text-sm whitespace-nowrap">
              Course Progress: {enrollment?.progressPercentage || 0}%
            </span>
            <div className="w-32" data-testid="progress-bar">
              <ProgressBar
                progress={enrollment?.progressPercentage || 0}
                size="sm"
                color="green"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Main Content */}
        <div id="course-player-main" className={`flex-1 min-w-0 ${sidebarOpen ? 'xl:mr-80' : ''}`}>
          {(completionReconcileError || completionReconcileInFlight) && (
            <section aria-label="Course progress refresh status" className="px-3 sm:px-6 bg-white">
              <div className="max-w-4xl mx-auto py-4">
                {completionReconcileInFlight && (
                  <p role="status">Refreshing course progress…</p>
                )}
                {completionReconcileError && (
                  <div
                    role="alert"
                    className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    <p>{completionReconcileError.message}</p>
                    <Button
                      variant="secondary"
                      onClick={completionReconcileError.retry}
                      aria-label="Retry refreshing course progress"
                      className="flex-shrink-0"
                    >
                      Retry refresh
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Auto-advance countdown — shown after a lesson completes */}
          {autoAdvance && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="p-3 sm:p-6 bg-white"
            >
              <div className="max-w-4xl mx-auto">
                <p className="text-gray-900">
                  Lesson completed. Moving to {autoAdvance.nextLesson.title} in {autoAdvance.secondsRemaining} seconds.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button
                    variant="primary"
                    onClick={() => {
                      clearAutoAdvance();
                      handleLessonClick(autoAdvance.nextLesson, {
                        focusContent: true,
                        closeMobileSidebar: !isDesktop,
                      });
                    }}
                  >
                    Go to next lesson now
                  </Button>
                  <Button variant="secondary" onClick={cancelAutoAdvance}>
                    Cancel auto-advance
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* QUIZ lesson — inline quiz taker, no video/article */}
          {currentLesson.contentType === ContentType.QUIZ && enrollment && (
            <div className="p-3 sm:p-6 bg-white" data-testid="lesson-content">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h2 ref={lessonHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-1">{currentLesson.title}</h2>
                  {currentLesson.description && (
                    <p className="text-gray-600">{currentLesson.description}</p>
                  )}
                </div>
                <InlineQuizTaker
                  key={currentLesson.id}
                  lesson={currentLesson}
                  onQuizPass={handleQuizPass}
                />
                <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 mt-8">
                  <Button
                    variant="secondary"
                    onClick={() => handleNavigate('previous')}
                    disabled={!getPreviousLesson()}
                    className="justify-self-start w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    <span className="sm:hidden">Previous</span>
                    <span className="hidden sm:inline">Previous Lesson</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleNavigate('next')}
                    disabled={!getNextLesson()}
                    className="justify-self-end w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
                  >
                    <span className="sm:hidden">Next</span>
                    <span className="hidden sm:inline">Next Lesson</span>
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Video Player - only for VIDEO type */}
          {currentLesson.contentType === ContentType.VIDEO && (
            (currentLesson.videoStreamUrl || currentLesson.video480pUrl || currentLesson.videoUrl) ? (
              <VideoPlayer
                key={currentLesson.id}
                ref={videoRef}
                src720p={currentLesson.videoStreamUrl}
                src480p={currentLesson.video480pUrl}
                fallbackSrc={currentLesson.videoUrl}
                captionSrc={currentLesson.videoCaptionUrl}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : (
              <div className="bg-black aspect-video flex items-center justify-center">
                <BookOpen className="w-20 h-20 text-gray-400" aria-hidden="true" />
              </div>
            )
          )}

          {/* Progress autosave status — persistent error with retry, not a toast */}
          <section aria-label="Video progress save status" className="px-3 sm:px-6">
            <div className="max-w-4xl mx-auto">
              {progressSaveState === 'saving' && (
                <p role="status" className="text-sm text-gray-300 py-2">
                  Saving video progress…
                </p>
              )}
              {progressSaveError && (
                <div
                  role="alert"
                  className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 my-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <p>{progressSaveError.message}</p>
                  <Button
                    variant="secondary"
                    onClick={progressSaveError.retry}
                    aria-label="Retry saving video progress"
                    className="flex-shrink-0"
                  >
                    Retry saving progress
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Lesson Content — not shown for QUIZ type (handled above) */}
          {currentLesson.contentType !== ContentType.QUIZ && (
          <div className="p-3 sm:p-6 bg-white" data-testid="lesson-content">
            <div className="max-w-4xl mx-auto">
              {/* Lesson Header */}
              <div
                ref={completionControlsRef}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6"
              >
                <div>
                  <h2 ref={lessonHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2">
                    {currentLesson.title}
                  </h2>
                  {currentLesson.description && (
                    <p className="text-gray-600">{currentLesson.description}</p>
                  )}
                </div>
                
                {( !currentLessonProgress?.isCompleted || completingLessonId === currentLesson.id ) && (
                  <Button
                    variant="primary"
                    onClick={handleMarkComplete}
                    disabled={completingLessonId === currentLesson.id}
                    aria-busy={completingLessonId === currentLesson.id}
                    aria-label="Mark complete"
                    className="flex-shrink-0"
                  >
                    {completingLessonId === currentLesson.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    )}
                    Mark Complete
                  </Button>
                )}

                {completionError && (
                  <div role="alert" className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                    <p>{completionError.message}</p>
                    <Button
                      variant="secondary"
                      onClick={completionError.retry}
                      aria-label="Retry marking lesson complete"
                      className="flex-shrink-0"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>

              {/* Lesson Content/Resources */}
              {currentLesson.articleContent && currentLesson.contentType === ContentType.ARTICLE && (
                <Card className="p-4 sm:p-8 mb-6">
                  <ArticleViewer
                    html={currentLesson.articleContent}
                    title="Lesson Content"
                  />
                </Card>
              )}

              {currentLesson.contentType === ContentType.VIDEO && (
                <Card className="p-4 sm:p-5 mb-6">
                  <section aria-labelledby="lesson-transcript-heading">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                          <FileText className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 id="lesson-transcript-heading" className="text-sm font-medium text-slate-800">
                            Transcript
                          </h3>
                          <p className="text-xs text-slate-500 truncate">
                            {currentLesson.articleContent
                              ? 'Read the transcript or download it as text.'
                              : currentLesson.videoCaptionUrl
                                ? 'Captions may be available in the player.'
                                : 'No transcript is attached to this video.'}
                          </p>
                        </div>
                      </div>
                      {currentLesson.articleContent && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleDownloadTranscript}
                          className="flex items-center gap-2"
                          aria-label={`Download transcript for ${currentLesson.title}`}
                        >
                          <Download aria-hidden="true" className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {currentLesson.articleContent ? (
                      <div className="mt-4">
                        <ArticleViewer html={currentLesson.articleContent} title="Transcript" />
                      </div>
                    ) : (
                      <p role="note" className="text-sm text-slate-500 mt-3">
                        A transcript is not available for this video.
                        {currentLesson.videoCaptionUrl
                          ? ' Captions may be available in the video player.'
                          : ''}
                      </p>
                    )}
                  </section>
                </Card>
              )}

              {/* Take Quiz Button (for ARTICLE and VIDEO lessons) */}
              {(currentLesson.contentType === ContentType.ARTICLE ||
                currentLesson.contentType === ContentType.VIDEO) && (
                <>
                  <div className="mb-6">
                    <Button
                      variant="primary"
                      onClick={quizModal.open}
                      disabled={lessonHasQuiz !== true}
                      className="flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      Take Quiz
                    </Button>
                    {lessonHasQuiz === null && (
                      <p className="text-xs text-gray-400 mt-1">Checking quiz availability…</p>
                    )}
                    {lessonHasQuiz === false && (
                      <p className="text-xs text-gray-500 mt-1">
                        No quiz available for this lesson yet.
                      </p>
                    )}
                  </div>
                  
                  {/* AI Lesson Summary */}
                  <LessonSummaryPanel lessonId={currentLesson.id} />

                  {/* AI Course Tutor is now accessed via floating button & overlay */}
                </>
              )}

              {/* Resources */}
              {currentLesson.resources && currentLesson.resources.length > 0 && (
                <Card className="p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
                  <ul className="space-y-2">
                    {currentLesson.resources.map((resource, index: number) => (
                      <li key={index}>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  variant="secondary"
                  onClick={() => handleNavigate('previous')}
                  disabled={!getPreviousLesson()}
                  className="justify-self-start w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  <span className="sm:hidden">Previous</span>
                  <span className="hidden sm:inline">Previous Lesson</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => handleNavigate('next')}
                  disabled={!getNextLesson()}
                  className="justify-self-end w-32 sm:w-44 md:w-52 h-11 sm:h-12 justify-center"
                >
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">Next Lesson</span>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>

        <CourseCurriculumSidebar
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          sections={sections}
          lessons={lessons}
          currentLessonId={currentLesson.id}
          completedLessonIds={new Set(
            allLessonProgress.filter((progress) => progress.isCompleted).map((progress) => progress.lessonId)
          )}
          completedLessons={enrollment?.completedLessons || 0}
          videoProgress={videoProgress}
          expandedSectionIds={expandedSectionIds}
          onToggleSection={toggleSection}
          onSelectLesson={(lesson) => {
            skipSidebarScroll.current = true;
            handleLessonClick(lesson, {
              focusContent: true,
              closeMobileSidebar: !isDesktop,
            });
          }}
          onClose={() => setSidebarOpen(false)}
          activeLessonRef={activeLessonRef}
          sidebarScrollRef={sidebarScrollRef}
        />
      </div>

      {completionModalOpen && (
        <CourseCompletionDialog
          courseTitle={course.title}
          onBackToLearning={() => navigate(USER_ROUTES.LEARNING)}
          onStay={closeCompletionModal}
        />
      )}

      {/* Quiz Taker Modal */}
      {currentLesson && enrollment && (
        <QuizTakerModal
          isOpen={quizModal.isOpen}
          onClose={quizModal.close}
          lesson={currentLesson}
          onQuizPass={handleQuizPass}
        />
      )}

      {/* AI Course Tutor: floating pill + overlay panel */}
      {resolvedCourseId !== null && (
        <>
          {/* Mobile backdrop */}
          {isChatOpen && (
            <div
              className="fixed inset-0 z-40 xl:hidden"
              onClick={closeChat}
            />
          )}

          {/* Panel */}
          {isChatOpen && (
            <React.Suspense fallback={null}>
              <AiChatPanel courseId={resolvedCourseId} onClose={closeChat} />
            </React.Suspense>
          )}

          {/* Floating pill trigger */}
          <button
            onClick={toggleChat}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3
                       bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                       rounded-full shadow-lg transition-all duration-200
                       md:bottom-6 md:right-6"
          >
            {isChatOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isChatOpen ? 'Close' : 'AI Tutor'}
            </span>
          </button>
        </>
      )}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {lessonAnnouncement}
        {completionAnnouncement}
      </div>
    </div>
  );
};

export default CoursePlayerPage;
