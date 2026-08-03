import { useEffect, useRef, useState } from 'react';
import type {
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  UpdateProgressRequest,
} from '@edumind/shared-types';
import { lessonProgressService } from '../../../../services/lesson-progress.service';
import type { ProgressSaveError } from '../course-player.types';

interface UseVideoProgressOptions {
  currentLesson: LessonResponse | null;
  enrollment: EnrollmentResponse | null;
  currentLessonProgress: LessonProgressResponse | null;
  lessons: LessonResponse[];
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

  // Safety net: clear any running autosave interval when the lesson changes
  // (covers a course/slug switch too, since that also swaps the lesson) or on
  // unmount. Manual navigation already clears it via stopAutosave().
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

    latestProgressPayloadRef.current = payload;
    progressSaveInFlightRef.current = true;
    setSaveState('saving');

    try {
      const saved = await lessonProgressService.updateWatchProgress(payload);
      if (latestProgressPayloadRef.current === payload) {
        latestProgressPayloadRef.current = null;
      }
      onProgressSaved(saved);
      setSaveState('idle');
      setSaveError(null);
      onProgressAnnouncement('Progress saved');
    } catch (err) {
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
