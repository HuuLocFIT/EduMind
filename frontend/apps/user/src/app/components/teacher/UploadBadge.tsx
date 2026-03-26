import React, { useState } from 'react';
import { Upload, ChevronUp, ChevronDown, X, Pause, Play } from 'lucide-react';
import { ProgressBar } from '@edumind/user-ui';
import { useUploadQueueStore } from '../../stores/uploadQueue.store.js';

export const UploadBadge: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const jobs = useUploadQueueStore((s) => s.jobs);
  const { pause, resume, cancel } = useUploadQueueStore.getState();

  const activeJobs = jobs.filter(
    (j) => j.status === 'UPLOADING' || j.status === 'QUEUED' || j.status === 'PAUSED',
  );
  const uploadingCount = jobs.filter((j) => j.status === 'UPLOADING').length;

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-800">
              {uploadingCount > 0
                ? `Uploading ${uploadingCount} video${uploadingCount > 1 ? 's' : ''}`
                : `${activeJobs.length} video${activeJobs.length > 1 ? 's' : ''} in queue`}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Expanded job list */}
        {expanded && (
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
            {activeJobs.map((job) => (
              <div key={job.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">
                    {job.lessonTitle}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {job.status === 'UPLOADING' && (
                      <button
                        onClick={() => pause(job.id)}
                        className="p-0.5 text-gray-400 hover:text-yellow-600"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {job.status === 'PAUSED' && job.file && (
                      <button
                        onClick={() => resume(job.id)}
                        className="p-0.5 text-gray-400 hover:text-green-600"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => cancel(job.id)}
                      className="p-0.5 text-gray-400 hover:text-red-500"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {job.status === 'UPLOADING' && (
                  <div className="space-y-1">
                    <ProgressBar progress={job.progress} size="sm" color="blue" />
                    <span className="text-[10px] text-gray-400">
                      {job.uploadActivity === 'RESUMING'
                        ? 'Resuming'
                        : job.uploadActivity === 'RESTARTING'
                          ? 'Restarting'
                          : 'Uploading'}{' '}
                      {job.progress}%
                    </span>
                  </div>
                )}
                {job.status === 'QUEUED' && (
                  <span className="text-[10px] text-blue-500">Waiting in queue...</span>
                )}
                {job.status === 'PAUSED' && (
                  <div className="space-y-1">
                    <ProgressBar progress={job.progress} size="sm" color="blue" />
                    <span className="text-[10px] text-yellow-600">Paused — {job.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
