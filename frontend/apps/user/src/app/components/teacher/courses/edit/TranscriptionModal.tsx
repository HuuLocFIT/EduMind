import React, { useCallback, useEffect, useState } from "react";
import type { LessonResponse, AiJobResponse } from "@edumind/shared-types";
import { AiJobStatus } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  Copy,
  Wand2,
  Youtube,
} from "lucide-react";
import { aiService, pollJobUntilDone } from "../../../../services/ai.service";

type Phase = "config" | "processing" | "completed" | "failed";

type UrlSource = "cloudinary" | "youtube" | "unknown";

function detectSource(url: string): UrlSource {
  if (url.includes("res.cloudinary.com")) return "cloudinary";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/"))
    return "youtube";
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
  const [language, setLanguage] = useState<"vi" | "en">("en");
  const [copied, setCopied] = useState(false);
  const [job, setJob] = useState<AiJobResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Derived from lesson — no state needed
  const videoUrl = lesson?.videoUrl ?? "";
  const source = videoUrl ? detectSource(videoUrl) : "unknown";

  useEffect(() => {
    if (isOpen) {
      setPhase("config");
      setJob(null);
      setErrorMessage("");
      setSubmitting(false);
      setLanguage("en");
      setCopied(false);
    }
  }, [isOpen]);

  const handleStart = useCallback(async () => {
    if (!lesson || !videoUrl) return;
    setSubmitting(true);
    setPhase("processing");
    setJob(null);
    setErrorMessage("");

    try {
      const jobResponse = await aiService.transcribeLesson(
        lesson.id,
        videoUrl,
        language,
      );
      setJob(jobResponse);

      const finalJob = await pollJobUntilDone(jobResponse.jobId, setJob, 5000);

      if (finalJob.status === AiJobStatus.COMPLETED) {
        setPhase("completed");
      } else {
        setErrorMessage(
          finalJob.errorMessage ?? "Transcription failed. Please try again.",
        );
        setPhase("failed");
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? "An unexpected error occurred.");
      setPhase("failed");
    } finally {
      setSubmitting(false);
    }
  }, [lesson, videoUrl, language]);

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
            Lesson:{" "}
            <span className="font-medium text-gray-700">{lesson.title}</span>
          </p>
        )}

        {phase === "config" && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Source
              </label>
              {videoUrl ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  {source === "cloudinary" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium shrink-0">
                      <Cloud className="w-3 h-3" /> Cloudinary
                    </span>
                  )}
                  {source === "youtube" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium shrink-0">
                      <Youtube className="w-3 h-3" /> YouTube
                    </span>
                  )}
                  {source === "unknown" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs shrink-0">
                      <AlertCircle className="w-3 h-3" /> Unsupported
                    </span>
                  )}
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {videoUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(videoUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy URL"
                  >
                    {copied ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No video uploaded yet. Upload a video to this lesson first.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spoken Language
              </label>
              <div className="flex gap-2">
                {(["vi", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      language === lang
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {lang === "vi" ? "Vietnamese" : "English"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Select the language spoken in the video. If the result looks
                wrong, try again with the other option.
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700 space-y-1">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>
                  Audio is extracted from your uploaded video and sent to Groq
                  Whisper
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
                disabled={!videoUrl || source === "unknown"}
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
                  job?.status === AiJobStatus.DELAYED
                    ? "bg-amber-100"
                    : "bg-blue-100"
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
                  Groq API is temporarily rate-limited. Your job will be
                  automatically retried — no action needed.
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
              <span className="font-medium">
                Transcript generated successfully
              </span>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
              The transcript has been saved to this lesson. Click{" "}
              <strong>Apply to Lesson</strong> to update the editor — you can
              then review and edit it before saving.
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
