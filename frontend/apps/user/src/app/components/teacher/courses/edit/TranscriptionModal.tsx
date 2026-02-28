import React, { useCallback, useEffect, useState } from "react";
import type { LessonResponse, AiJobResponse } from "@edumind/shared-types";
import { AiJobStatus } from "@edumind/shared-types";
import { Modal, Button, Input } from "@edumind/user-ui";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  Wand2,
  Youtube,
} from "lucide-react";
import { aiService, pollJobUntilDone } from "../../../../services/ai.service";

type Phase = "config" | "processing" | "completed" | "failed";

type UrlSource = "cloudinary" | "youtube" | "unknown";

function detectSource(url: string): UrlSource {
  if (url.includes("res.cloudinary.com")) return "cloudinary";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "youtube";
  return "unknown";
}

const STATUS_CONFIG: Record<
  AiJobStatus,
  {
    progress: number;
    label: string;
    barClass: string;
  }
> = {
  [AiJobStatus.PENDING]: {
    progress: 10,
    label: "Queued...",
    barClass: "from-blue-400 to-cyan-400",
  },
  [AiJobStatus.PROCESSING]: {
    progress: 55,
    label: "Transcribing audio...",
    barClass: "from-blue-500 to-cyan-500",
  },
  [AiJobStatus.DELAYED]: {
    progress: 30,
    label: "Rate limited — will retry automatically in ~60s",
    barClass: "from-amber-400 to-yellow-400 animate-pulse",
  },
  [AiJobStatus.COMPLETED]: {
    progress: 100,
    label: "Done!",
    barClass: "from-green-400 to-emerald-500",
  },
  [AiJobStatus.FAILED]: {
    progress: 100,
    label: "Failed",
    barClass: "from-red-400 to-rose-500",
  },
};

interface TranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonResponse | null;
  onTranscriptionApplied: () => void;
}

export const TranscriptionModal: React.FC<TranscriptionModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onTranscriptionApplied,
}) => {
  const [phase, setPhase] = useState<Phase>("config");
  const [url, setUrl] = useState<string>("");
  const [source, setSource] = useState<UrlSource>("unknown");
  const [job, setJob] = useState<AiJobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhase("config");
      setJob(null);
      setErrorMessage("");
      setSubmitting(false);
      const initialUrl = lesson?.videoUrl || "";
      setUrl(initialUrl);
      setSource(initialUrl ? detectSource(initialUrl) : "unknown");
    }
  }, [isOpen, lesson]);

  useEffect(() => {
    setSource(url ? detectSource(url) : "unknown");
  }, [url]);

  const handleStart = useCallback(async () => {
    if (!lesson || !url) return;
    setSubmitting(true);
    setPhase("processing");
    setJob(null);
    setErrorMessage("");

    try {
      const jobResponse = await aiService.transcribeLesson(lesson.id, url);
      setJob(jobResponse);

      const finalJob = await pollJobUntilDone(jobResponse.jobId, setJob, 5000);

      if (finalJob.status === AiJobStatus.COMPLETED) {
        setPhase("completed");
      } else {
        setErrorMessage(
          finalJob.errorMessage ?? "Transcription failed. Please try again."
        );
        setPhase("failed");
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? "An unexpected error occurred.");
      setPhase("failed");
    } finally {
      setSubmitting(false);
    }
  }, [lesson, url]);

  const handleTryAgain = () => {
    setPhase("config");
    setJob(null);
    setErrorMessage("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎧 Auto-Transcribe Video"
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {lesson && (
          <p className="text-sm text-gray-500">
            Lesson: <span className="font-medium text-gray-700">{lesson.title}</span>
          </p>
        )}

        {phase === "config" && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL
                <span className="text-xs text-gray-400 font-normal ml-2">
                  (Cloudinary or YouTube)
                </span>
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/... or https://youtube.com/watch?v=..."
              />
              {url && (
                <div className="mt-2 flex items-center gap-2">
                  {source === "cloudinary" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      <Cloud className="w-3 h-3" /> Cloudinary
                    </span>
                  )}
                  {source === "youtube" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                      <Youtube className="w-3 h-3" /> YouTube
                    </span>
                  )}
                  {source === "unknown" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                      <AlertCircle className="w-3 h-3" /> Unsupported URL type
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700 space-y-1">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>Cloudinary: audio extracted on-the-fly, sent to Groq Whisper</li>
                <li>
                  YouTube: auto-captions used if available (faster, free); audio downloaded
                  otherwise
                </li>
                <li>Takes 30 – 120 seconds depending on video length</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStart}
                disabled={!url || source === "unknown"}
                isLoading={submitting}
                leftIcon={<Wand2 className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Transcription
              </Button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  job?.status === AiJobStatus.DELAYED ? "bg-amber-100" : "bg-blue-100"
                }`}
              >
                {job?.status === AiJobStatus.DELAYED ? (
                  <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
                ) : (
                  <Wand2 className="w-8 h-8 text-blue-500 animate-pulse" />
                )}
              </div>
              <p className="text-gray-700 font-medium">
                {job ? STATUS_CONFIG[job.status].label : "Starting..."}
              </p>
              {job?.status === AiJobStatus.DELAYED && (
                <p className="text-xs text-amber-600 mt-2 max-w-xs mx-auto">
                  Groq API is temporarily rate-limited. Your job will be automatically retried —
                  no action needed.
                </p>
              )}
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full bg-gradient-to-r transition-all duration-500 ${
                  job
                    ? STATUS_CONFIG[job.status].barClass
                    : "from-blue-400 to-cyan-400"
                }`}
                style={{
                  width: `${job ? STATUS_CONFIG[job.status].progress : 5}%`,
                }}
              />
            </div>

            <p className="text-xs text-center text-gray-400">
              Transcription typically takes 30–120 seconds for a 1-hour video.
            </p>
          </div>
        )}

        {phase === "completed" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Transcript generated successfully</span>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
              The transcript has been saved to this lesson. Click{" "}
              <strong>Apply to Lesson</strong> to update the editor — you can then review and
              edit it before saving.
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onTranscriptionApplied();
                  onClose();
                }}
                leftIcon={<CheckCircle className="w-4 h-4" />}
                className="bg-green-600 hover:bg-green-700"
              >
                Apply to Lesson
              </Button>
            </div>
          </div>
        )}

        {phase === "failed" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-900 font-medium">Transcription Failed</p>
              {errorMessage && (
                <p className="text-sm text-red-600 mt-2 max-w-sm mx-auto">
                  {errorMessage}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleTryAgain}
                leftIcon={<Wand2 className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

