import React, { useState, useEffect, useCallback } from "react";
import type { LessonResponse, AiJobResponse, GeneratedQuizResponse, QuizQuestionDto } from "@edumind/shared-types";
import { AiJobStatus } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";
import { Sparkles, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Pencil, X, Save } from "lucide-react";
import { aiService, pollJobUntilDone } from "../../../../services/ai.service";

type Phase = "config" | "generating" | "completed" | "failed";

interface QuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonResponse | null;
}

/** Render questions read-only (used for both current and previous quizzes) */
function QuestionCardReadOnly({ q, qi, expandedExplanations, onToggleExplanation }: {
  q: QuizQuestionDto;
  qi: number;
  expandedExplanations: Set<number>;
  onToggleExplanation: (qi: number) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50">
        <p className="font-medium text-gray-900">{qi + 1}. {q.question}</p>
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
            <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              oi === q.correctIndex ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
            }`}>
              {String.fromCharCode(65 + oi)}
            </span>
            {opt}
          </div>
        ))}
      </div>
      {q.explanation && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => onToggleExplanation(qi)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
          >
            {expandedExplanations.has(qi) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Explanation
          </button>
          {expandedExplanations.has(qi) && (
            <div className="px-4 pb-3 text-sm text-gray-600 bg-purple-50">{q.explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}

/** Editable question card */
function QuestionCardEditable({ q, qi, draft, onEdit, onCancel, onSave, saving }: {
  q: QuizQuestionDto;
  qi: number;
  draft: QuizQuestionDto | undefined;
  onEdit: (qi: number) => void;
  onCancel: (qi: number) => void;
  onSave: (qi: number, updated: QuizQuestionDto) => void;
  saving: boolean;
  expandedExplanations: Set<number>;
  onToggleExplanation: (qi: number) => void;
}) {
  const [localDraft, setLocalDraft] = useState<QuizQuestionDto>(draft ?? q);

  // Sync when draft changes externally (e.g. edit button clicked)
  useEffect(() => {
    if (draft) setLocalDraft(draft);
  }, [draft]);

  const isEditing = draft !== undefined;

  const setOption = (oi: number, val: string) => {
    setLocalDraft(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === oi ? val : o),
    }));
  };

  if (!isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 flex items-start justify-between gap-2">
          <p className="font-medium text-gray-900">{qi + 1}. {q.question}</p>
          <button
            onClick={() => onEdit(qi)}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
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
              <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                oi === q.correctIndex ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
              }`}>
                {String.fromCharCode(65 + oi)}
              </span>
              {opt}
            </div>
          ))}
        </div>
        {q.explanation && (
          <div className="border-t border-gray-100 px-4 py-2 text-sm text-gray-500 bg-purple-50/50">
            <span className="font-medium text-purple-700">Explanation:</span> {q.explanation}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-2 border-purple-300 rounded-lg overflow-hidden">
      <div className="p-4 bg-purple-50">
        <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
        <textarea
          className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          rows={2}
          value={localDraft.question}
          onChange={e => setLocalDraft(prev => ({ ...prev, question: e.target.value }))}
        />
      </div>
      <div className="p-4 space-y-2">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Options — select the correct answer
        </label>
        {localDraft.options.map((opt: string, oi: number) => (
          <div key={oi} className="flex items-center gap-3">
            <input
              type="radio"
              name={`correct-${qi}`}
              checked={localDraft.correctIndex === oi}
              onChange={() => setLocalDraft(prev => ({ ...prev, correctIndex: oi }))}
              className="w-4 h-4 text-purple-600 accent-purple-600 flex-shrink-0"
            />
            <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              localDraft.correctIndex === oi ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
            }`}>
              {String.fromCharCode(65 + oi)}
            </span>
            <input
              type="text"
              value={opt}
              onChange={e => setOption(oi, e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        ))}
      </div>
      <div className="px-4 pb-3 border-t border-purple-100 pt-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">Explanation</label>
        <textarea
          className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          rows={2}
          value={localDraft.explanation ?? ""}
          onChange={e => setLocalDraft(prev => ({ ...prev, explanation: e.target.value }))}
        />
      </div>
      <div className="flex items-center justify-end gap-2 px-4 pb-3">
        <button
          onClick={() => onCancel(qi)}
          disabled={saving}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          onClick={() => onSave(qi, localDraft)}
          disabled={saving || !localDraft.question.trim()}
          className="flex items-center gap-1 text-xs text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
        >
          {saving ? <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>
    </div>
  );
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
  const [allQuizzes, setAllQuizzes] = useState<GeneratedQuizResponse[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  // Per-question edit drafts: Map<questionIndex, draft>
  const [editingDrafts, setEditingDrafts] = useState<Map<number, QuizQuestionDto>>(new Map());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  // Which previous quizzes are expanded
  const [expandedPrevIds, setExpandedPrevIds] = useState<Set<number>>(new Set());
  const [prevExplanations, setPrevExplanations] = useState<Map<number, Set<number>>>(new Map());

  // Reset state when modal opens; also fetch existing quizzes
  useEffect(() => {
    if (isOpen && lesson) {
      setPhase("config");
      setQuestionCount(5);
      setJob(null);
      setQuiz(null);
      setAllQuizzes([]);
      setExpandedExplanations(new Set());
      setErrorMessage("");
      setGenerating(false);
      setEditingDrafts(new Map());
      setSavingIndex(null);
      setExpandedPrevIds(new Set());
      setPrevExplanations(new Map());

      // Fetch existing quizzes
      setLoadingExisting(true);
      aiService.getQuizzesByLesson(lesson.id)
        .then((quizzes) => {
          setAllQuizzes(quizzes);
          if (quizzes.length > 0) {
            setQuiz(quizzes[0]);
            setPhase("completed");
          }
        })
        .catch(() => {
          // Silently ignore — modal still usable
        })
        .finally(() => setLoadingExisting(false));
    }
  }, [isOpen, lesson]);

  const handleGenerate = useCallback(async () => {
    if (!lesson) return;
    setGenerating(true);
    setPhase("generating");
    setJob(null);
    setEditingDrafts(new Map());

    try {
      const jobResponse = await aiService.generateQuiz(lesson.id, questionCount);
      setJob(jobResponse);

      const finalJob = await pollJobUntilDone(jobResponse.jobId, (updatedJob) => {
        setJob(updatedJob);
      });

      if (finalJob.status === AiJobStatus.COMPLETED) {
        const quizzes = await aiService.getQuizzesByLesson(lesson.id);
        const latestQuiz = quizzes.find((q) => q.jobId === finalJob.jobId) ?? quizzes[0] ?? null;
        setQuiz(latestQuiz);
        setAllQuizzes(quizzes);
        setPhase("completed");
      } else {
        setErrorMessage(finalJob.errorMessage ?? "Quiz generation failed. Please try again.");
        setPhase("failed");
      }
    } catch (err: unknown) {
      setErrorMessage((err as { message?: string })?.message ?? "An unexpected error occurred.");
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
    setEditingDrafts(new Map());
  };

  const toggleExplanation = (index: number) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const togglePrevExpanded = (quizId: number) => {
    setExpandedPrevIds(prev => {
      const next = new Set(prev);
      if (next.has(quizId)) next.delete(quizId); else next.add(quizId);
      return next;
    });
  };

  const togglePrevExplanation = (quizId: number, qi: number) => {
    setPrevExplanations(prev => {
      const set = new Set(prev.get(quizId) ?? []);
      if (set.has(qi)) set.delete(qi); else set.add(qi);
      const next = new Map(prev);
      next.set(quizId, set);
      return next;
    });
  };

  const handleEdit = (qi: number) => {
    if (!quiz) return;
    setEditingDrafts(prev => {
      const next = new Map(prev);
      next.set(qi, { ...quiz.questions[qi] });
      return next;
    });
  };

  const handleCancelEdit = (qi: number) => {
    setEditingDrafts(prev => {
      const next = new Map(prev);
      next.delete(qi);
      return next;
    });
  };

  const handleSaveEdit = async (qi: number, updated: QuizQuestionDto) => {
    if (!quiz) return;
    setSavingIndex(qi);
    try {
      const updatedQuestions = quiz.questions.map((q, i) => i === qi ? updated : q);
      const updatedQuiz = await aiService.updateQuizQuestions(quiz.id, updatedQuestions);
      setQuiz(updatedQuiz);
      setAllQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
      setEditingDrafts(prev => {
        const next = new Map(prev);
        next.delete(qi);
        return next;
      });
    } catch {
      // Keep edit open on failure
    } finally {
      setSavingIndex(null);
    }
  };

  const previousQuizzes = allQuizzes.filter(q => q.id !== quiz?.id);

  const statusProgress: Record<AiJobStatus, number> = {
    [AiJobStatus.PENDING]: 10,
    [AiJobStatus.PROCESSING]: 60,
    [AiJobStatus.DELAYED]: 30,
    [AiJobStatus.COMPLETED]: 100,
    [AiJobStatus.FAILED]: 100,
  };
  const progress = job ? statusProgress[job.status] : 5;
  const statusLabel: Record<AiJobStatus, string> = {
    [AiJobStatus.PENDING]: "Waiting to start...",
    [AiJobStatus.PROCESSING]: "Generating questions...",
    [AiJobStatus.DELAYED]: "Rate limited — will retry automatically in ~60s",
    [AiJobStatus.COMPLETED]: "Done!",
    [AiJobStatus.FAILED]: "Failed",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Quiz Generator" size="lg">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {lesson && (
          <p className="text-sm text-gray-500">
            Lesson: <span className="font-medium text-gray-700">{lesson.title}</span>
          </p>
        )}

        {/* ==================== CONFIG PHASE ==================== */}
        {phase === "config" && (
          <div className="space-y-6">
            {loadingExisting && (
              <p className="text-sm text-gray-400 text-center">Loading existing quizzes…</p>
            )}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {quiz.questionCount} question{quiz.questionCount !== 1 ? "s" : ""} — click Edit to fix any question
                </span>
              </div>
            </div>

            {/* Question Cards — editable */}
            <div className="space-y-4">
              {quiz.questions.map((q: QuizQuestionDto, qi: number) => (
                <QuestionCardEditable
                  key={qi}
                  q={q}
                  qi={qi}
                  draft={editingDrafts.get(qi)}
                  onEdit={handleEdit}
                  onCancel={handleCancelEdit}
                  onSave={handleSaveEdit}
                  saving={savingIndex === qi}
                  expandedExplanations={expandedExplanations}
                  onToggleExplanation={toggleExplanation}
                />
              ))}
            </div>

            {/* Previous Quizzes */}
            {previousQuizzes.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700">
                  Previous Quizzes ({previousQuizzes.length})
                </div>
                <div className="divide-y divide-gray-100">
                  {previousQuizzes.map((pq) => (
                    <div key={pq.id}>
                      <button
                        onClick={() => togglePrevExpanded(pq.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span>
                          {pq.questionCount} question{pq.questionCount !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs">{new Date(pq.createdAt).toLocaleDateString()}</span>
                          {expandedPrevIds.has(pq.id)
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>
                      {expandedPrevIds.has(pq.id) && (
                        <div className="px-4 pb-4 space-y-3">
                          {pq.questions.map((q: QuizQuestionDto, qi: number) => (
                            <QuestionCardReadOnly
                              key={qi}
                              q={q}
                              qi={qi}
                              expandedExplanations={prevExplanations.get(pq.id) ?? new Set()}
                              onToggleExplanation={(i) => togglePrevExplanation(pq.id, i)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
