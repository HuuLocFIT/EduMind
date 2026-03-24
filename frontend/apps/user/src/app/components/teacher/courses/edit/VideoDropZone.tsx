import React, { useCallback, useRef } from 'react';
import {
  Upload,
  Pause,
  Play,
  X,
  RefreshCw,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Film,
} from 'lucide-react';
import { ProgressBar, Button } from '@edumind/user-ui';
import { useUploadQueueStore } from '../../../../stores/uploadQueue.store.js';
import { videoUploadService } from '../../../../services/video-upload.service.js';

const ACCEPTED_VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

interface VideoDropZoneProps {
  lessonId: number | null;
  lessonTitle: string;
  currentVideoUrl: string | null;
  currentUploadStatus: string;
  onVideoReady?: () => void;
  onVideoRemoved?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const VideoDropZone: React.FC<VideoDropZoneProps> = ({
  lessonId,
  lessonTitle,
  currentVideoUrl,
  currentUploadStatus,
  onVideoReady,
  onVideoRemoved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const job = useUploadQueueStore((s) =>
    lessonId ? s.jobs.find((j) => j.lessonId === lessonId) : undefined,
  );
  const { enqueue, pause, resume, cancel, retry, removeJob } = useUploadQueueStore();

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!lessonId) return;
      if (file.size > MAX_FILE_SIZE) {
        alert('File size exceeds 2GB limit');
        return;
      }
      try {
        enqueue(lessonId, lessonTitle, file);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to start upload');
      }
    },
    [lessonId, lessonTitle, enqueue],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      // Reset so the same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect],
  );

  const handleDeleteVideo = async () => {
    if (!lessonId) return;
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await videoUploadService.deleteVideo(lessonId);
      onVideoRemoved?.();
    } catch {
      alert('Failed to delete video');
    }
  };

  // Lesson not saved yet
  if (!lessonId) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <Film className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Save the lesson first to upload a video</p>
      </div>
    );
  }

  // Active upload job exists
  if (job) {
    switch (job.status) {
      case 'QUEUED':
        return (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-blue-700">Waiting in queue...</span>
              </div>
              <button
                onClick={() => cancel(job.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {job.file && (
              <p className="text-xs text-blue-500 mt-1">
                {job.file.name} ({formatFileSize(job.file.size)})
              </p>
            )}
          </div>
        );

      case 'UPLOADING': {
        const statusLabel =
          job.uploadActivity === 'RESUMING'
            ? 'Resuming upload...'
            : job.uploadActivity === 'RESTARTING'
              ? 'Restarting upload...'
              : 'Uploading...';

        return (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {statusLabel} {job.progress}%
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => pause(job.id)}
                  className="p-1 text-gray-500 hover:text-yellow-600 transition-colors"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cancel(job.id)}
                  className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ProgressBar progress={job.progress} size="md" color="blue" />
            {job.file && (
              <p className="text-xs text-blue-500">
                {job.file.name} — {formatFileSize(job.bytesUploaded)} /{' '}
                {formatFileSize(job.file.size)}
              </p>
            )}
          </div>
        );
      }

      case 'PAUSED':
        return (
          <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-yellow-700">
                Paused — {job.progress}%
              </span>
              <div className="flex items-center gap-1">
                {job.file ? (
                  <button
                    onClick={() => resume(job.id)}
                    className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                    title="Resume"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  onClick={() => cancel(job.id)}
                  className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ProgressBar progress={job.progress} size="md" color="blue" />
            {job.error && <p className="text-xs text-yellow-600">{job.error}</p>}
          </div>
        );

      case 'DONE':
        // Remove completed job from store and let the READY state below handle it
        setTimeout(() => {
          removeJob(job.id);
          onVideoReady?.();
        }, 0);
        return (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Upload complete!</span>
            </div>
          </div>
        );

      case 'FAILED':
        return (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Upload failed</span>
              </div>
              <button
                onClick={() => removeJob(job.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {job.error && <p className="text-xs text-red-500">{job.error}</p>}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_VIDEO_TYPES}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    retry(job.id, file);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        );
    }
  }

  // Video already uploaded (READY state from backend)
  if (currentVideoUrl && currentUploadStatus === 'READY') {
    return (
      <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Video uploaded</span>
          </div>
          <button
            onClick={handleDeleteVideo}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete video"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <video
          src={currentVideoUrl}
          controls
          className="w-full rounded-lg max-h-64"
          preload="metadata"
        />
      </div>
    );
  }

  // Legacy video URL (YouTube or other — videoUploadStatus is NONE but videoUrl exists)
  if (currentVideoUrl && currentUploadStatus !== 'READY') {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Legacy video URL</span>
            <p className="text-xs text-gray-500 truncate max-w-xs">{currentVideoUrl}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Replace with upload
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // Default: Empty drop zone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer
        hover:border-green-400 hover:bg-green-50 transition-colors"
    >
      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
      <p className="text-sm font-medium text-gray-700">
        Drag & drop your video here, or click to browse
      </p>
      <p className="text-xs text-gray-400 mt-1">MP4, WebM, MOV — up to 2GB</p>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
};
