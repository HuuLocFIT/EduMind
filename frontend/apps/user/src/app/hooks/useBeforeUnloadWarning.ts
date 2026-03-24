import { useEffect } from 'react';
import { useUploadQueueStore } from '../stores/uploadQueue.store.js';

/**
 * Warns the user before closing/refreshing the tab if uploads are in progress.
 * Call this once at a high level (e.g., TeacherLayout).
 */
export function useBeforeUnloadWarning() {
  const hasActiveUploads = useUploadQueueStore((s) =>
    s.jobs.some((j) => j.status === 'UPLOADING' || j.status === 'QUEUED'),
  );

  useEffect(() => {
    if (!hasActiveUploads) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasActiveUploads]);
}
