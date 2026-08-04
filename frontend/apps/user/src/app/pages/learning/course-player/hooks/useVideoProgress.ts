import { useEffect, useRef, useState } from 'react';
import type {
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  UpdateProgressRequest,
} from '@edumind/shared-types';
import { lessonProgressService } from '../../../../services/lesson-progress.service';
import type { ProgressSaveError } from '../course-player.types';
import { useVersionGuard } from './useVersionGuard';

interface UseVideoProgressOptions {
  currentLesson: LessonResponse | null;
  enrollment: EnrollmentResponse | null;
  currentLessonProgress: LessonProgressResponse | null;
  lessons: LessonResponse[];
  /** Course slug, used to reset autosave state when switching courses. */
  courseSlug: string | undefined;
  /** Called after a successful save so the caller can upsert its progress list. */
  onProgressSaved: (saved: LessonProgressResponse) => void;
  /** Called after a successful save to announce it to screen readers. */
  onProgressAnnouncement: (message: string) => void;
}

/**
 * Owns the video-progress autosave orchestration: the periodic 10s save
 * while a video plays, the resume-from-lastPosition seek, and the retry flow
 * for a failed save. Reads the live current lesson/enrollment via refs so
 * the autosave interval never persists a stale payload. A failed payload is
 * kept in latestProgressPayloadRef so Retry resends the exact request, even
 * after the user navigates to another lesson or moves the playhead.
 */
export function useVideoProgress({
  currentLesson,
  enrollment,
  currentLessonProgress,
  lessons,
  courseSlug,
  onProgressSaved,
  onProgressAnnouncement,
}: UseVideoProgressOptions) {
  const [videoProgress, setVideoProgress] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [saveError, setSaveError] = useState<ProgressSaveError | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestProgressPayloadRef = useRef<UpdateProgressRequest | null>(null);
  const progressSaveInFlightRef = useRef(false);
  // Bumped whenever courseSlug changes so a save started for the previous
  // course can never write its result (or a stale error) onto the next one.
  const courseVersion = useVersionGuard();

  // Live values for the autosave interval so it never reads a stale closure.
  const currentLessonRef = useRef<LessonResponse | null>(null);
  const enrollmentRef = useRef<EnrollmentResponse | null>(null);

  useEffect(() => {
    currentLessonRef.current = currentLesson;
  }, [currentLesson]);

  useEffect(() => {
    enrollmentRef.current = enrollment;
  }, [enrollment]);

  // When current lesson or all progress changes, sync video progress percentage
  useEffect(() => {
    if (!currentLesson) return;
    if (currentLessonProgress) {
      setVideoProgress(currentLessonProgress.watchPercentage || 0);
    } else {
      setVideoProgress(0);
    }
  }, [currentLesson, currentLessonProgress]);

  // Safety net: clear any running autosave interval when the lesson changes or
  // on unmount. Manual navigation already clears it via stopAutosave(). A
  // course/slug switch clears the interval via the [courseSlug] effect below.
  useEffect(() => {
    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = null;
      }
    };
  }, [currentLesson?.id]);

  const handleTimeUpdate = () => {
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

    const version = courseVersion.current();
    latestProgressPayloadRef.current = payload;
    progressSaveInFlightRef.current = true;
    setSaveState('saving');

    try {
      const saved = await lessonProgressService.updateWatchProgress(payload);
      // The course changed while this request was in flight — the [courseSlug]
      // effect already reset payload/error/state for the new course, so drop
      // this result instead of upserting the previous course's progress into it.
      if (!courseVersion.isCurrent(version)) return;
      if (latestProgressPayloadRef.current === payload) {
        latestProgressPayloadRef.current = null;
      }
      onProgressSaved(saved);
      setSaveState('idle');
      setSaveError(null);
      onProgressAnnouncement('Progress saved');
    } catch (err) {
      if (!courseVersion.isCurrent(version)) return;
      console.error('Error saving progress:', err);
      setSaveState('error');
      const failedLesson = lessons.find((l) => l.id === payload.lessonId);
      setSaveError({
        message:
          'Video progress could not be saved. Your latest position may not be available on another device.' +
          (failedLesson ? ` Retrying progress for "${failedLesson.title}".` : ''),
        retry: () => retrySave(),
      });
    } finally {
      // If the course changed mid-request, the [courseSlug] effect already
      // reset this flag for the new course — don't clobber the new course's
      // in-flight state by unconditionally resetting it here.
      if (courseVersion.isCurrent(version)) {
        progressSaveInFlightRef.current = false;
      }
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
  const retrySave = async () => {
    const payload = latestProgressPayloadRef.current;
    if (!payload) return;
    await saveProgressPayload(payload);
  };

  // Seek video to last watched position when metadata is loaded
  const handleLoadedMetadata = () => {
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

  // Called before a lesson change (or on completion) to stop the autosave
  // interval and reset the video element so the next lesson does not inherit
  // the previous lesson's playhead position.
  const stopAutosave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset position so new lesson does not inherit previous time
      videoRef.current.currentTime = 0;
    }
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }
  };

  // Reset autosave state when the course/slug changes. The lesson-keyed
  // cleanup above cannot cover a switch into a course with no lesson (the id
  // never changes), so this effect explicitly stops the interval and drops any
  // pending failed payload/save state that belongs to the previous course.
  // Also bumps courseVersion so a save request already in flight for the
  // previous course drops its result/error instead of applying it here.
  // Cross-lesson retry behavior is intentionally preserved.
  useEffect(() => {
    courseVersion.bump();
    stopAutosave();
    latestProgressPayloadRef.current = null;
    progressSaveInFlightRef.current = false;
    setSaveError(null);
    setSaveState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  return {
    videoProgress,
    setVideoProgress,
    saveState,
    saveError,
    handleTimeUpdate,
    handleLoadedMetadata,
    stopAutosave,
    retrySave,
    videoRef,
  };
}
