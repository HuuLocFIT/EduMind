import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { videoUploadService } from '../services/video-upload.service.js';

const MAX_CONCURRENT = 2;

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Upload failed unexpectedly';
};

const isStaleUploadLockError = (message: string): boolean =>
  message.toLowerCase().includes('already has an upload in progress');

const isCloudinaryRangeMismatchError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  const isChunkRequestError =
    normalized.includes('upload chunk failed with status 400') ||
    normalized.includes('upload chunk failed with status 409');

  const hasRangeHint =
    normalized.includes('content-range') ||
    normalized.includes('content range') ||
    normalized.includes('range') ||
    normalized.includes('offset') ||
    normalized.includes('part number');

  return isChunkRequestError && hasRangeHint;
};

export type UploadJobStatus = 'QUEUED' | 'UPLOADING' | 'PAUSED' | 'DONE' | 'FAILED';
export type UploadActivity = 'UPLOADING' | 'RESUMING' | 'RESTARTING';

export interface UploadJob {
  id: string;
  lessonId: number;
  lessonTitle: string;
  file: File | null; // null after page refresh (not serializable)
  progress: number;
  status: UploadJobStatus;
  uploadSessionId: string;
  bytesUploaded: number;
  error: string | null;
  abortController: AbortController | null;
  uploadActivity: UploadActivity | null;
}

// Serializable subset for localStorage persistence
interface PersistedJob {
  id: string;
  lessonId: number;
  lessonTitle: string;
  uploadSessionId: string;
  bytesUploaded: number;
  status: UploadJobStatus;
  progress: number;
}

interface UploadQueueState {
  jobs: UploadJob[];

  // Actions
  enqueue: (lessonId: number, lessonTitle: string, file: File) => string;
  pause: (jobId: string) => void;
  resume: (jobId: string) => void;
  cancel: (jobId: string) => void;
  retry: (jobId: string, file: File) => void;
  removeCompleted: () => void;
  removeJob: (jobId: string) => void;
  getJobByLessonId: (lessonId: number) => UploadJob | undefined;

  // Internal (prefixed with _)
  _processQueue: () => void;
  _executeUpload: (jobId: string) => Promise<void>;
  _updateJob: (jobId: string, updates: Partial<UploadJob>) => void;
}

export const useUploadQueueStore = create<UploadQueueState>()(
  persist(
    (set, get) => ({
      jobs: [],

      enqueue: (lessonId: number, lessonTitle: string, file: File): string => {
        const { jobs } = get();

        // Prevent duplicate upload for same lesson
        const existing = jobs.find(
          (j) => j.lessonId === lessonId && (j.status === 'QUEUED' || j.status === 'UPLOADING'),
        );
        if (existing) {
          throw new Error('This lesson already has an upload in progress');
        }

        const jobId = crypto.randomUUID();
        const uploadSessionId = crypto.randomUUID();

        const newJob: UploadJob = {
          id: jobId,
          lessonId,
          lessonTitle,
          file,
          progress: 0,
          status: 'QUEUED',
          uploadSessionId,
          bytesUploaded: 0,
          error: null,
          abortController: null,
          uploadActivity: null,
        };

        set((state) => ({ jobs: [...state.jobs, newJob] }));

        // Trigger queue processing
        setTimeout(() => get()._processQueue(), 0);

        return jobId;
      },

      pause: (jobId: string) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || job.status !== 'UPLOADING') return;

        // Abort the current upload
        job.abortController?.abort();

        get()._updateJob(jobId, {
          status: 'PAUSED',
          abortController: null,
          uploadActivity: null,
        });
      },

      resume: (jobId: string) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || job.status !== 'PAUSED') return;

        if (!job.file) {
          // File lost after refresh — can't resume without re-selecting
          get()._updateJob(jobId, {
            error: 'File reference lost. Please retry with the file.',
          });
          return;
        }

        get()._updateJob(jobId, { status: 'QUEUED', error: null });
        setTimeout(() => get()._processQueue(), 0);
      },

      cancel: (jobId: string) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return;

        // Abort if uploading
        if (job.status === 'UPLOADING') {
          job.abortController?.abort();
        }

        // Remove from queue
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) }));

        // Process next in queue
        setTimeout(() => get()._processQueue(), 0);
      },

      retry: (jobId: string, file: File) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || (job.status !== 'FAILED' && job.status !== 'PAUSED')) return;

        get()._updateJob(jobId, {
          file,
          status: 'QUEUED',
          error: null,
          uploadActivity: null,
          bytesUploaded: 0,
          progress: 0,
          uploadSessionId: crypto.randomUUID(),
        });

        setTimeout(() => get()._processQueue(), 0);
      },

      removeCompleted: () => {
        set((state) => ({
          jobs: state.jobs.filter((j) => j.status !== 'DONE'),
        }));
      },

      removeJob: (jobId: string) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (job?.status === 'UPLOADING') {
          job.abortController?.abort();
        }
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) }));
      },

      getJobByLessonId: (lessonId: number) => {
        return get().jobs.find((j) => j.lessonId === lessonId);
      },

      _updateJob: (jobId: string, updates: Partial<UploadJob>) => {
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)),
        }));
      },

      _processQueue: () => {
        const { jobs, _executeUpload } = get();
        const activeCount = jobs.filter((j) => j.status === 'UPLOADING').length;
        const slotsAvailable = MAX_CONCURRENT - activeCount;

        if (slotsAvailable <= 0) return;

        const queued = jobs.filter((j) => j.status === 'QUEUED' && j.file !== null);
        const toStart = queued.slice(0, slotsAvailable);

        for (const job of toStart) {
          _executeUpload(job.id);
        }
      },

      _executeUpload: async (jobId: string) => {
        const { _updateJob, _processQueue } = get();
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || !job.file) return;

        const abortController = new AbortController();
        const initialActivity: UploadActivity =
          job.bytesUploaded > 0 ? 'RESUMING' : 'UPLOADING';
        _updateJob(jobId, {
          status: 'UPLOADING',
          abortController,
          error: null,
          uploadActivity: initialActivity,
        });

        try {
          let retriedAfterReset = false;
          let retriedFromZero = false;
          let currentUploadId = job.uploadSessionId;
          let currentStartFromByte = job.bytesUploaded;
          let lastProgressUpdate = 0;
          const PROGRESS_THROTTLE_MS = 200;

          while (true) {
            try {
              // Step 1: Get upload signature from backend
              const signature = await videoUploadService.getUploadSignature(job.lessonId);

              // Step 2: Upload chunks directly to Cloudinary
              const result = await videoUploadService.uploadToCloudinary({
                file: job.file,
                signature,
                uploadId: currentUploadId,
                startFromByte: currentStartFromByte,
                signal: abortController.signal,
                onProgress: (percent, bytesUploaded) => {
                  const now = Date.now();
                  if (percent < 100 && now - lastProgressUpdate < PROGRESS_THROTTLE_MS) return;
                  lastProgressUpdate = now;
                  _updateJob(jobId, { progress: percent, bytesUploaded });
                },
              });

              // Step 3: Confirm upload with backend
              await videoUploadService.confirmUpload(job.lessonId, {
                cloudinaryUrl: result.secure_url,
                publicId: result.public_id,
                duration: Math.round(result.duration),
              });

              break;
            } catch (error) {
              if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
              }

              const errorMessage = extractErrorMessage(error);
              const isStaleUploadState = isStaleUploadLockError(errorMessage);

              if (isStaleUploadState && !retriedAfterReset) {
                await videoUploadService.resetUploadState(job.lessonId);
                retriedAfterReset = true;
                continue;
              }

              if (isCloudinaryRangeMismatchError(errorMessage) && !retriedFromZero) {
                currentUploadId = crypto.randomUUID();
                currentStartFromByte = 0;
                retriedFromZero = true;
                retriedAfterReset = false; // allow stale lock reset for the upcoming new signature request

                _updateJob(jobId, {
                  uploadSessionId: currentUploadId,
                  bytesUploaded: 0,
                  progress: 0,
                  error: null,
                  uploadActivity: 'RESTARTING',
                });

                continue;
              }

              throw error;
            }
          }

          _updateJob(jobId, {
            status: 'DONE',
            progress: 100,
            abortController: null,
            uploadActivity: null,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            // User paused or cancelled — status already set by pause/cancel action
            return;
          }

          const errorMessage = extractErrorMessage(error);

          _updateJob(jobId, {
            status: 'FAILED',
            error: errorMessage,
            abortController: null,
            uploadActivity: null,
          });
        } finally {
          // Always try to process next job in queue
          setTimeout(() => _processQueue(), 0);
        }
      },
    }),
    {
      name: 'upload-queue-storage',
      partialize: (state) => ({
        jobs: state.jobs
          .filter((j) => j.status !== 'DONE') // Don't persist completed jobs
          .map(
            (j): PersistedJob => ({
              id: j.id,
              lessonId: j.lessonId,
              lessonTitle: j.lessonTitle,
              uploadSessionId: j.uploadSessionId,
              bytesUploaded: j.bytesUploaded,
              status: j.status === 'UPLOADING' ? 'PAUSED' : j.status, // Reset uploading to paused
              progress: j.progress,
            }),
          ),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as { jobs?: PersistedJob[] } | undefined;
        if (!persistedState?.jobs) return current;

        // Restore persisted jobs with null File (user must re-select)
        const restoredJobs: UploadJob[] = persistedState.jobs.map((pj) => ({
          ...pj,
          file: null,
          error: pj.status === 'PAUSED' ? 'Page was refreshed. Please re-select the file to resume.' : null,
          abortController: null,
          uploadActivity: null,
        }));

        return {
          ...current,
          jobs: restoredJobs,
        };
      },
    },
  ),
);

// Network detection: auto-pause on offline, auto-resume on online
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    const { jobs, pause } = useUploadQueueStore.getState();
    jobs
      .filter((j) => j.status === 'UPLOADING')
      .forEach((j) => pause(j.id));
  });

  window.addEventListener('online', () => {
    const { jobs, resume } = useUploadQueueStore.getState();
    jobs
      .filter((j) => j.status === 'PAUSED' && j.file !== null)
      .forEach((j) => resume(j.id));
  });
}
