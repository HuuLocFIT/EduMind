import React, { useState, useEffect, useCallback } from "react";
import type { LessonResponse, AiJobResponse, GeneratedQuizResponse, QuizQuestionDto } from "@edumind/shared-types";
import { AiJobStatus } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";
import { Sparkles, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import { aiService, pollJobUntilDone } from "../../../../services/ai.service";

type Phase = "config" | "generating" | "completed" | "failed";

interface QuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonResponse | null;
}

export const QuizGeneratorModal: React.FC<QuizGeneratorModalProps> = ({
  isOpen,
  onClose,
  lesson,
}) => {
  const [phase, setPhase] = useState<Phase>("config");
  const [questionCount, setQuestionCount] = useState(5);
  const [job, setJob] = useState<AiJobResponse | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuizResponse | null>(null);
  const [previousQuizzes, setPreviousQuizzes] = useState<GeneratedQuizResponse[]>([]);
  const [expandedPrevious, setExpandedPrevious] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("config");
      setQuestionCount(5);
      setJob(null);
      setQuiz(null);
      setPreviousQuizzes([]);
      setExpandedPrevious(false);
      setExpandedExplanations(new Set());
      setErrorMessage("");
      setGenerating(false);
    }
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    if (!lesson) return;
    setGenerating(true);
    setPhase("generating");
    setJob(null);

    try {
      const jobResponse = await aiService.generateQuiz(lesson.id, questionCount);
      setJob(jobResponse);

      const finalJob = await pollJobUntilDone(jobResponse.jobId, (updatedJob) => {
        setJob(updatedJob);
      });

      if (finalJob.status === AiJobStatus.COMPLETED) {
        // Fetch quizzes for this lesson to get the latest one
        const quizzes = await aiService.getQuizzesByLesson(lesson.id);
        // The latest quiz is associated with the job we just ran
        const latestQuiz = quizzes.find((q) => q.jobId === finalJob.jobId) ?? quizzes[0] ?? null;
        setQuiz(latestQuiz);
        setPreviousQuizzes(quizzes.filter((q) => q.jobId !== finalJob.jobId));
        setPhase("completed");
      } else {
        setErrorMessage(finalJob.errorMessage ?? "Quiz generation failed. Please try again.");
        setPhase("failed");
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? "An unexpected error occurred.");
      setPhase("failed");
    } finally {
      setGenerating(false);
    }
  }, [lesson, questionCount]);

  const handleTryAgain = () => {
    setPhase("config");
    setJob(null);
    setQuiz(null);
    setErrorMessage("");
  };

  const toggleExplanation = (index: number) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const statusProgress: Record<AiJobStatus, number> = {
    [AiJobStatus.PENDING]: 10,
    [AiJobStatus.PROCESSING]: 60,
    [AiJobStatus.COMPLETED]: 100,
    [AiJobStatus.FAILED]: 100,
  };
  const progress = job ? statusProgress[job.status] : 5;
  const statusLabel: Record<AiJobStatus, string> = {
    [AiJobStatus.PENDING]: "Waiting to start...",
    [AiJobStatus.PROCESSING]: "Generating questions...",
    [AiJobStatus.COMPLETED]: "Done!",
    [AiJobStatus.FAILED]: "Failed",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ AI Quiz Generator"
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {lesson && (
          <p className="text-sm text-gray-500">
            Lesson: <span className="font-medium text-gray-700">{lesson.title}</span>
          </p>
        )}

        {/* ==================== CONFIG PHASE ==================== */}
        {phase === "config" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg font-medium"
                />
                <span className="text-sm text-gray-500">questions (1 – 20)</span>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-700">
                <strong>How it works:</strong> The AI will read the article content and generate
                multiple-choice questions with explanations. This may take 5–30 seconds.
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                isLoading={generating}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Generate Quiz
              </Button>
            </div>
          </div>
        )}

        {/* ==================== GENERATING PHASE ==================== */}
        {phase === "generating" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
              </div>
              <p className="text-gray-700 font-medium">
                {job ? statusLabel[job.status] : "Starting..."}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-gray-400">
              Please wait — this typically takes 5–30 seconds.
            </p>
          </div>
        )}

        {/* ==================== COMPLETED PHASE ==================== */}
        {phase === "completed" && quiz && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                {quiz.questionCount} question{quiz.questionCount !== 1 ? "s" : ""} generated
              </span>
            </div>

            {/* Question Cards */}
            <div className="space-y-4">
              {quiz.questions.map((q: QuizQuestionDto, qi: number) => (
                <div key={qi} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50">
                    <p className="font-medium text-gray-900">
                      {qi + 1}. {q.question}
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    {q.options.map((opt: string, oi: number) => (
                      <div
                        key={oi}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                          oi === q.correctIndex
                            ? "bg-green-100 text-green-800 font-medium"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            oi === q.correctIndex
                              ? "bg-green-500 text-white"
                              : "bg-gray-300 text-gray-600"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>
                  {/* Explanation accordion */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => toggleExplanation(qi)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      {expandedExplanations.has(qi) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      Explanation
                    </button>
                    {expandedExplanations.has(qi) && (
                      <div className="px-4 pb-3 text-sm text-gray-600 bg-purple-50">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Previous Quizzes */}
            {previousQuizzes.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedPrevious((p) => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span>Previous Quizzes ({previousQuizzes.length})</span>
                  {expandedPrevious ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedPrevious && (
                  <div className="divide-y divide-gray-100">
                    {previousQuizzes.map((pq) => (
                      <div key={pq.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">
                            {pq.questionCount} question{pq.questionCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(pq.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="secondary" onClick={handleTryAgain}>
                Generate Again
              </Button>
              <Button
                variant="primary"
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ==================== FAILED PHASE ==================== */}
        {phase === "failed" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-900 font-medium">Generation Failed</p>
              {errorMessage && (
                <p className="text-sm text-red-600 mt-2 max-w-sm mx-auto">{errorMessage}</p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleTryAgain}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-purple-600 hover:bg-purple-700"
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
