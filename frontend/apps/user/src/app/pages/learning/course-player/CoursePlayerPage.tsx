import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useModal } from '@edumind/user-ui';
import { LessonContentSkeleton } from '../../../components/route-skeletons/LessonContentSkeleton';
import { SeoMetaTags } from '../../../components/Seo/SeoMetaTags';
import { useLessonTypeHint } from '../../../hooks/useLessonTypeHint';
import type { LessonResponse, LessonProgressResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import { BookOpen } from 'lucide-react';
import { USER_ROUTES } from '@edumind/shared-utils';
import { VideoPlayer } from '../../../components/learning/VideoPlayer';
import { QuizTakerModal } from '../../../components/learning/QuizTakerModal';
import { CourseCurriculumSidebar } from './components/CourseCurriculumSidebar';
import { CourseAccessErrorDialog } from './components/CourseAccessErrorDialog';
import { CourseCompletionDialog } from './components/CourseCompletionDialog';
import { CoursePlayerHeader } from './components/CoursePlayerHeader';
import { LessonNavigation } from './components/LessonNavigation';
import { ProgressSaveStatus } from './components/ProgressSaveStatus';
import { CompletionReconcileStatus } from './components/CompletionReconcileStatus';
import { AutoAdvanceBanner } from './components/AutoAdvanceBanner';
import { AiTutorOverlay } from './components/AiTutorOverlay';
import { CourseNotFound } from './components/CourseNotFound';
import { CourseLessonContent } from './components/CourseLessonContent';
import { findLessonProgress, htmlToPlainText } from './course-player.utils';
import type { CompletionSource } from './course-player.types';
import {
  useAccessErrorRedirect,
  useAutoAdvance,
  useCoursePlayerData,
  useCoursePlayerLayout,
  useLessonCompletion,
  useLessonNavigation,
  useLessonQuizAvailability,
  useVideoProgress,
} from './hooks';

export const CoursePlayerPage: React.FC = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quizModal = useModal();

  const AUTO_ADVANCE_SECONDS = 5;

  // Owned here (rather than inside useLessonNavigation) because
  // useCoursePlayerLayout also needs its value, and useLessonNavigation needs
  // useCoursePlayerLayout's isDesktop/refs output — keeping currentLesson at
  // this level avoids a circular dependency between the two hooks while both
  // still own all of the *logic* built on top of it.
  const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  const {
    resolvedCourseId,
    course,
    sections,
    lessons,
    expandedSectionIds,
    toggleSection,
    allLessonProgress,
    setAllLessonProgress,
    enrollment,
    setEnrollment,
    loading,
    accessError,
    confirmedCourseComplete,
    reconcileEnrollmentProgress,
  } = useCoursePlayerData({ courseSlug, currentLesson, searchParams, setSearchParams, setCurrentLesson });

  const redirectCountdown = useAccessErrorRedirect(accessError, navigate);

  const layout = useCoursePlayerLayout(currentLesson);

  // Best-effort guess at the current lesson's content type before real data
  // has loaded (query param / localStorage hint), so the loading skeleton
  // shows the right shape instead of a generic shell.
  const contentTypeHint = useLessonTypeHint();

  // Refs
  const completionModalShownRef = useRef(false);
  const completionControlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    completionModalShownRef.current = false;
    setCompletionModalOpen(false);
  }, [courseSlug]);

  const { hasQuiz: lessonHasQuiz, setHasQuiz: setLessonHasQuiz } = useLessonQuizAvailability(
    currentLesson?.id,
    currentLesson?.contentType
  );

  // Derived progress for the current lesson
  const currentLessonProgress: LessonProgressResponse | null = currentLesson
    ? findLessonProgress(allLessonProgress, currentLesson.id)
    : null;

  // Video progress autosave orchestration (periodic save, retry, resume seek).
  const {
    videoProgress,
    setVideoProgress,
    saveState: progressSaveState,
    saveError: progressSaveError,
    handleTimeUpdate: handleVideoTimeUpdate,
    handleLoadedMetadata: handleVideoLoadedMetadata,
    stopAutosave,
    videoRef,
  } = useVideoProgress({
    currentLesson,
    enrollment,
    currentLessonProgress,
    lessons,
    courseSlug,
    onProgressSaved: (saved) => {
      setAllLessonProgress((prev) => {
        const existing = prev.find((p) => p.lessonId === saved.lessonId);
        if (!existing) return [...prev, saved];
        return prev.map((p) => (p.lessonId === saved.lessonId ? saved : p));
      });
    },
    onProgressAnnouncement: (message) => navigation.setLessonAnnouncement(message),
  });

  // ── Auto-advance countdown ──────────────────────────────────────────────────

  // `onAdvance`/`onCancelFocus` close over `navigation`/`layout`, which are
  // declared below — safe because these callbacks only ever run later, in
  // response to the timer firing or the user cancelling, by which point both
  // are assigned.
  const { autoAdvance, startAutoAdvance, clearAutoAdvance, cancelAutoAdvance } = useAutoAdvance({
    delaySeconds: AUTO_ADVANCE_SECONDS,
    onAdvance: (nextLesson, options) => navigation.selectLesson(nextLesson, options),
    onCancelFocus: () => layout.focusLessonHeading(),
    isDesktop: layout.isDesktop,
    resetKey: courseSlug,
  });

  // Composed from the auto-advance hook and the video-progress hook's
  // stopAutosave so useLessonNavigation never has to import those hooks
  // directly — it only needs to know something must run before a lesson
  // change happens.
  const onBeforeLessonChange = () => {
    clearAutoAdvance();
    stopAutosave();
  };

  const navigation = useLessonNavigation({
    courseSlug,
    currentLesson,
    setCurrentLesson,
    lessons,
    allLessonProgress,
    isDesktop: layout.isDesktop,
    setSearchParams,
    pendingLessonFocusRef: layout.pendingLessonFocusRef,
    lessonHeadingRef: layout.lessonHeadingRef,
    setSidebarOpen: layout.setSidebarOpen,
    setVideoProgress,
    setLessonHasQuiz,
    onBeforeLessonChange,
  });

  // Restores keyboard focus to the Mark Complete control after an optimistic
  // rollback, instead of letting focus fall back to the page body.
  const restoreCompletionFocus = () => {
    requestAnimationFrame(() => {
      completionControlsRef.current
        ?.querySelector<HTMLButtonElement>('[aria-label="Mark complete"]')
        ?.focus();
    });
  };

  // Single completion path for manual, video-ended and quiz-pass so progress
  // updates, announcements, rollback and auto-advance stay consistent.
  const {
    completingLessonId,
    completionError,
    completionReconcileError,
    completionReconcileInFlight,
    completionAnnouncement,
    completeLesson,
  } = useLessonCompletion({
    currentLesson,
    enrollment,
    lessons,
    allLessonProgress,
    resolvedCourseId,
    getNextLesson: () => navigation.nextLesson,
    onProgressChange: setAllLessonProgress,
    onEnrollmentChange: setEnrollment,
    reconcileEnrollmentProgress,
    startAutoAdvance,
    clearAutoAdvance,
    stopAutosave,
    restoreCompletionFocus,
  });

  const handleComplete = (source: CompletionSource) => {
    if (!currentLesson || !enrollment) return;
    void completeLesson(source);
  };

  const handleVideoEnded = () => handleComplete('video');
  const handleMarkComplete = () => handleComplete('manual');
  const handleQuizPass = () => handleComplete('quiz');

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
    layout.focusLessonHeading();
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

  const pageMetadata = (
    <SeoMetaTags
      title={currentLesson?.title ?? course?.title ?? 'Course Player'}
      description={
        course?.title
          ? `Continue learning ${course.title} on EduMind.`
          : 'Continue your course on EduMind.'
      }
      noIndex
    />
  );

  // Access error modal – shown when user is DROPPED/SUSPENDED or not properly enrolled
  if (accessError) {
    return (
      <>
        {pageMetadata}
        <CourseAccessErrorDialog
          title={accessError.title}
          message={accessError.message}
          redirectCountdown={redirectCountdown}
          onGoBack={() => navigate(-1)}
          onGoNow={() => navigate(accessError.redirectTo)}
        />
      </>
    );
  }

  if (!loading && (!course || !currentLesson)) {
    return (
      <>
        {pageMetadata}
        <CourseNotFound onBackToLearning={() => navigate(USER_ROUTES.LEARNING)} />
      </>
    );
  }

  // While `loading`, `course`/`currentLesson` are legitimately still null —
  // the header/sidebar below render their own internal skeletons for that
  // case instead of this page unmounting into a separate full-page skeleton,
  // so the header and sidebar never flicker/remount once data arrives. Only
  // the lesson-content column swaps from skeleton to real content (see the
  // comment at that swap for why it isn't height-animated).
  const rootContentType = currentLesson?.contentType ?? (loading ? contentTypeHint : undefined);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        rootContentType === ContentType.VIDEO ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      {pageMetadata}
      {loading && (
        <p role="status" className="sr-only">
          Loading course player
        </p>
      )}

      <CoursePlayerHeader
        courseTitle={course?.title ?? ''}
        progressPercentage={enrollment?.progressPercentage || 0}
        sidebarOpen={layout.sidebarOpen}
        sidebarToggleRef={layout.sidebarToggleRef}
        onExit={() => navigate(USER_ROUTES.LEARNING)}
        onToggleSidebar={() => layout.setSidebarOpen(!layout.sidebarOpen)}
        loading={loading}
      />

      <div className="flex relative flex-1">
        {/* Main Content */}
        <div
          id="course-player-main"
          className={`flex-1 min-w-0 flex flex-col ${layout.sidebarOpen ? 'xl:mr-80' : ''}`}
        >
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
                navigation.selectLesson(autoAdvance.nextLesson, {
                  focusContent: true,
                  closeMobileSidebar: !layout.isDesktop,
                });
              }}
              onCancel={cancelAutoAdvance}
            />
          )}

          {loading || !currentLesson ? (
            <LessonContentSkeleton contentType={contentTypeHint} />
          ) : (
            <>
              {/* Video Player - only for VIDEO type */}
              {currentLesson.contentType === ContentType.VIDEO && (
                (currentLesson.videoStreamUrl || currentLesson.video480pUrl || currentLesson.videoUrl) ? (
                  <VideoPlayer
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

              {/* Keep a failed video save actionable after lesson navigation:
                  the retry owns the original lesson's exact payload. Saving
                  announcements remain exclusive to video lessons. */}
              {(currentLesson.contentType === ContentType.VIDEO || progressSaveError) && (
                <ProgressSaveStatus
                  state={
                    currentLesson.contentType === ContentType.VIDEO
                      ? progressSaveState
                      : 'error'
                  }
                  error={progressSaveError}
                  onRetry={() => progressSaveError?.retry()}
                />
              )}

              <CourseLessonContent
                lesson={currentLesson}
                enrollment={enrollment}
                currentLessonProgress={currentLessonProgress}
                completingLessonId={completingLessonId}
                completionError={completionError}
                lessonHasQuiz={lessonHasQuiz}
                lessonHeadingRef={layout.lessonHeadingRef}
                completionControlsRef={completionControlsRef}
                onMarkComplete={handleMarkComplete}
                onQuizPass={handleQuizPass}
                onOpenQuiz={quizModal.open}
                onDownloadTranscript={handleDownloadTranscript}
              />
            </>
          )}

          {/* Flex-1 spacer, not the content above, absorbs any leftover
              space so LessonNavigation sits at the viewport bottom even
              when content is shorter than the viewport — see the comment
              on #course-player-main above. */}
          <div className="flex-1" aria-hidden="true" />

          <LessonNavigation
            hasPrevious={!loading && !!navigation.previousLesson}
            hasNext={!loading && !!navigation.nextLesson}
            onPrevious={navigation.navigatePrevious}
            onNext={navigation.navigateNext}
          />
        </div>

        <CourseCurriculumSidebar
          isOpen={layout.sidebarOpen}
          isDesktop={layout.isDesktop}
          sections={sections}
          lessons={lessons}
          currentLessonId={currentLesson?.id ?? -1}
          completedLessonIds={new Set(
            allLessonProgress.filter((progress) => progress.isCompleted).map((progress) => progress.lessonId)
          )}
          completedLessons={enrollment?.completedLessons || 0}
          videoProgress={videoProgress}
          expandedSectionIds={expandedSectionIds}
          onToggleSection={toggleSection}
          onSelectLesson={(lesson) => {
            layout.skipSidebarScroll.current = true;
            navigation.selectLesson(lesson, {
              focusContent: true,
              closeMobileSidebar: !layout.isDesktop,
            });
          }}
          onClose={() => layout.setSidebarOpen(false)}
          activeLessonRef={layout.activeLessonRef}
          sidebarScrollRef={layout.sidebarScrollRef}
          loading={loading}
        />
      </div>

      {completionModalOpen && course && (
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
        {navigation.lessonAnnouncement}
        {completionAnnouncement}
      </div>
    </div>
  );
};

export default CoursePlayerPage;
