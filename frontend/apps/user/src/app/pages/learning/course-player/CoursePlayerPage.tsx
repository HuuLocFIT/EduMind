import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useModal,
} from '@edumind/user-ui';
import { CoursePlayerSkeleton } from '../../../components/route-skeletons/CoursePlayerSkeleton';
import { lessonProgressService } from '../../../services/lesson-progress.service';
import { aiService } from '../../../services/ai.service';
import type {
  EnrollmentResponse,
  LessonResponse,
  LessonProgressResponse,
  UpdateProgressRequest,
} from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import {
  BookOpen,
} from 'lucide-react';
import { USER_ROUTES } from '@edumind/shared-utils';
import { VideoPlayer } from '../../../components/learning/VideoPlayer';
import { QuizTakerModal } from '../../../components/learning/QuizTakerModal';
import { CourseCurriculumSidebar } from './components/CourseCurriculumSidebar';
import { CourseAccessErrorDialog } from './components/CourseAccessErrorDialog';
import { CourseCompletionDialog } from './components/CourseCompletionDialog';
import { CoursePlayerHeader } from './components/CoursePlayerHeader';
import { ProgressSaveStatus } from './components/ProgressSaveStatus';
import { CompletionReconcileStatus } from './components/CompletionReconcileStatus';
import { AutoAdvanceBanner } from './components/AutoAdvanceBanner';
import { AiTutorOverlay } from './components/AiTutorOverlay';
import { CourseNotFound } from './components/CourseNotFound';
import { CourseLessonContent } from './components/CourseLessonContent';
import type {
  AutoAdvanceState,
  CompletionError,
  CompletionSource,
  LessonClickOptions,
  ProgressSaveError,
} from './course-player.types';
import {
  calculateOptimisticCourseProgress,
  findLessonProgress,
  getAdjacentLessons,
  htmlToPlainText,
} from './course-player.utils';
import { useAccessErrorRedirect, useCoursePlayerData } from './hooks';

export const CoursePlayerPage: React.FC = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quizModal = useModal();

  const AUTO_ADVANCE_SECONDS = 5;

  // State
  const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  // null = still checking, true/false = resolved
  const [lessonHasQuiz, setLessonHasQuiz] = useState<boolean | null>(null);
  const [lessonAnnouncement, setLessonAnnouncement] = useState('');
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  const {
    resolvedCourseId,
    course,
    sections,
    lessons,
    expandedSectionIds,
    setExpandedSectionIds,
    allLessonProgress,
    setAllLessonProgress,
    enrollment,
    setEnrollment,
    loading,
    accessError,
    confirmedCourseComplete,
    reconcileEnrollmentProgress,
  } = useCoursePlayerData({ courseSlug, searchParams, setSearchParams, setCurrentLesson });

  const redirectCountdown = useAccessErrorRedirect(accessError, navigate);

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

  // Data loading (course/sections/lessons/enrollment/progress) lives in
  // useCoursePlayerData; this page still owns the auto-advance/progress
  // timers, so clear them whenever the course changes or the page unmounts.
  useEffect(() => {
    return () => {
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
    return <CourseNotFound onBackToLearning={() => navigate(USER_ROUTES.LEARNING)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <CoursePlayerHeader
        courseTitle={course.title}
        progressPercentage={enrollment?.progressPercentage || 0}
        sidebarOpen={sidebarOpen}
        sidebarToggleRef={sidebarToggleRef}
        onExit={() => navigate(USER_ROUTES.LEARNING)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex relative">
        {/* Main Content */}
        <div id="course-player-main" className={`flex-1 min-w-0 ${sidebarOpen ? 'xl:mr-80' : ''}`}>
          {(completionReconcileError || completionReconcileInFlight) && (
            <CompletionReconcileStatus
              inFlight={completionReconcileInFlight}
              error={completionReconcileError}
              onRetry={() => completionReconcileError?.retry()}
            />
          )}

          {/* Auto-advance countdown — shown after a lesson completes */}
          {autoAdvance && (
            <AutoAdvanceBanner
              nextLessonTitle={autoAdvance.nextLesson.title}
              secondsRemaining={autoAdvance.secondsRemaining}
              onGoNow={() => {
                clearAutoAdvance();
                handleLessonClick(autoAdvance.nextLesson, {
                  focusContent: true,
                  closeMobileSidebar: !isDesktop,
                });
              }}
              onCancel={cancelAutoAdvance}
            />
          )}

          {/* QUIZ lesson — inline quiz taker, no video/article */}
          {currentLesson.contentType === ContentType.QUIZ && (
            <CourseLessonContent
              lesson={currentLesson}
              enrollment={enrollment}
              currentLessonProgress={currentLessonProgress}
              completingLessonId={completingLessonId}
              completionError={completionError}
              lessonHasQuiz={lessonHasQuiz}
              lessonHeadingRef={lessonHeadingRef}
              completionControlsRef={completionControlsRef}
              onMarkComplete={handleMarkComplete}
              onQuizPass={handleQuizPass}
              onOpenQuiz={quizModal.open}
              onDownloadTranscript={handleDownloadTranscript}
              hasPrevious={!!getPreviousLesson()}
              hasNext={!!getNextLesson()}
              onPrevious={() => handleNavigate('previous')}
              onNext={() => handleNavigate('next')}
            />
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
          <ProgressSaveStatus
            state={progressSaveState}
            error={progressSaveError}
            onRetry={() => progressSaveError?.retry()}
          />

          {/* Lesson Content — not shown for QUIZ type (handled above) */}
          {currentLesson.contentType !== ContentType.QUIZ && (
            <CourseLessonContent
              lesson={currentLesson}
              enrollment={enrollment}
              currentLessonProgress={currentLessonProgress}
              completingLessonId={completingLessonId}
              completionError={completionError}
              lessonHasQuiz={lessonHasQuiz}
              lessonHeadingRef={lessonHeadingRef}
              completionControlsRef={completionControlsRef}
              onMarkComplete={handleMarkComplete}
              onQuizPass={handleQuizPass}
              onOpenQuiz={quizModal.open}
              onDownloadTranscript={handleDownloadTranscript}
              hasPrevious={!!getPreviousLesson()}
              hasNext={!!getNextLesson()}
              onPrevious={() => handleNavigate('previous')}
              onNext={() => handleNavigate('next')}
            />
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
      {resolvedCourseId !== null && <AiTutorOverlay courseId={resolvedCourseId} />}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {lessonAnnouncement}
        {completionAnnouncement}
      </div>
    </div>
  );
};

export default CoursePlayerPage;
