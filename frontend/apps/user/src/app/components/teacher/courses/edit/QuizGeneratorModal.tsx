import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import type { LessonResponse, AiJobResponse, GeneratedQuizResponse, QuizQuestionDto, SectionDetailResponse } from "@edumind/shared-types";
import { AiJobStatus } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";
import { Sparkles, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Pencil, X, Save, FileText, Video } from "lucide-react";
import { aiService, pollJobUntilDone } from "../../../../services/ai.service";
import { ContentType } from "@edumind/shared-constants";

type Phase = "config" | "generating" | "completed" | "failed";

interface QuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonResponse | null;
  sections?: SectionDetailResponse[];
  allLessons?: LessonResponse[];
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
    setLocalDraft((prev: QuizQuestionDto) => ({
      ...prev,
      options: prev.options.map((o: string, i: number) => i === oi ? val : o),
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
        <label htmlFor={`question-text-${qi}`} className="block text-xs font-medium text-gray-500 mb-1">Question</label>
        <textarea
          id={`question-text-${qi}`}
          className="w-full text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          rows={2}
          value={localDraft.question}
          onChange={e => setLocalDraft((prev: QuizQuestionDto) => ({ ...prev, question: e.target.value }))}
        />
      </div>
      <div className="p-4 space-y-2">
        <p className="block text-xs font-medium text-gray-500 mb-1">
          Options — select the correct answer
        </p>
        {localDraft.options.map((opt: string, oi: number) => (
          <div key={oi} className="flex items-center gap-3">
            <input
              type="radio"
              name={`correct-${qi}`}
              checked={localDraft.correctIndex === oi}
              onChange={() => setLocalDraft((prev: QuizQuestionDto) => ({ ...prev, correctIndex: oi }))}
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
        <label htmlFor={`question-explanation-${qi}`} className="block text-xs font-medium text-gray-500 mb-1">Explanation</label>
        <textarea
          id={`question-explanation-${qi}`}
          className="w-full text-sm text-gray-700 bg-white border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          rows={2}
          value={localDraft.explanation ?? ""}
          onChange={e => setLocalDraft((prev: QuizQuestionDto) => ({ ...prev, explanation: e.target.value }))}
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

/** Source lesson selector grouped by section */
const SourceLessonSelector = memo(function SourceLessonSelector({ sections, allLessons, selectedIds, onChange }: {
  sections: SectionDetailResponse[];
  allLessons: LessonResponse[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const selectableLessons = useMemo(
    () => allLessons.filter(l => l.contentType === ContentType.VIDEO || l.contentType === ContentType.ARTICLE),
    [allLessons]
  );

  if (selectableLessons.length === 0) return null;

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  const toggleSection = (sectionId: number) => {
    const inSection = selectableLessons.filter(l => l.sectionId === sectionId).map(l => l.id);
    const allSelected = inSection.every(id => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter(id => !inSection.includes(id)));
    } else {
      const toAdd = inSection.filter(id => !selectedIds.includes(id));
      onChange([...selectedIds, ...toAdd]);
    }
  };

  const ungrouped = selectableLessons.filter(l => !l.sectionId || !sections.find(s => s.id === l.sectionId));

  return (
    <div className="space-y-2">
      {sections.map(section => {
        const sectionLessons = selectableLessons.filter(l => l.sectionId === section.id);
        if (sectionLessons.length === 0) return null;
        const allSelected = sectionLessons.every(l => selectedIds.includes(l.id));
        const someSelected = sectionLessons.some(l => selectedIds.includes(l.id));
        return (
          <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide truncate">
                {section.title}
              </span>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ml-2 ${
                  allSelected
                    ? "bg-purple-100 text-purple-700 border-purple-300"
                    : someSelected
                    ? "bg-purple-50 text-purple-600 border-purple-200"
                    : "bg-white text-gray-500 border-gray-300 hover:border-purple-300"
                }`}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {sectionLessons.map(lesson => (
                <label key={lesson.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lesson.id)}
                    onChange={() => toggle(lesson.id)}
                    className="w-4 h-4 rounded text-purple-600 accent-purple-600 flex-shrink-0"
                  />
                  <span className="text-gray-400 flex-shrink-0">
                    {lesson.contentType === ContentType.VIDEO ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{lesson.title}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {ungrouped.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Other lessons</span>
          </div>
          <div className="divide-y divide-gray-100">
            {ungrouped.map(lesson => (
              <label key={lesson.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(lesson.id)}
                  onChange={() => toggle(lesson.id)}
                  className="w-4 h-4 rounded text-purple-600 accent-purple-600 flex-shrink-0"
                />
                <span className="text-gray-400 flex-shrink-0">
                  {lesson.contentType === ContentType.VIDEO ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                </span>
                <span className="text-sm text-gray-700 truncate">{lesson.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const QuizGeneratorModal: React.FC<QuizGeneratorModalProps> = ({
  isOpen,
  onClose,
  lesson,
  sections = [],
  allLessons = [],
}) => {
  const [phase, setPhase] = useState<Phase>("config");
  const [questionCount, setQuestionCount] = useState(5);
  const [questionCountInput, setQuestionCountInput] = useState("5");
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [job, setJob] = useState<AiJobResponse | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuizResponse | null>(null);
  const [allQuizzes, setAllQuizzes] = useState<GeneratedQuizResponse[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [editingDrafts, setEditingDrafts] = useState<Map<number, QuizQuestionDto>>(new Map());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [expandedPrevIds, setExpandedPrevIds] = useState<Set<number>>(new Set());
  const [prevExplanations, setPrevExplanations] = useState<Map<number, Set<number>>>(new Map());

  const isQuizLesson = lesson?.contentType === ContentType.QUIZ;
  // Only QUIZ-type lessons show the multi-source selector; VIDEO/ARTICLE always use their own content
  const hasMultiSelector = isQuizLesson;

  const lessonId = lesson?.id;
  const lessonContentType = lesson?.contentType;

  useEffect(() => {
    if (!isOpen || !lessonId) return;

    setPhase("config");
    setQuestionCount(5);
    setQuestionCountInput("5");
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
    setSelectedSourceIds(lessonContentType === ContentType.QUIZ ? [] : [lessonId]);

    setLoadingExisting(true);
    aiService.getQuizzesByLesson(lessonId)
      .then((quizzes) => {
        setAllQuizzes(quizzes);
        if (quizzes.length > 0) {
          setQuiz(quizzes[0]);
          setPhase("completed");
        }
      })
      .catch((_e: unknown) => undefined)
      .finally(() => setLoadingExisting(false));
  }, [isOpen, lessonId]);

  const handleGenerate = useCallback(async () => {
    if (!lesson) return;
    setGenerating(true);
    setPhase("generating");
    setJob(null);
    setEditingDrafts(new Map());

    try {
      const sourceIds = hasMultiSelector ? selectedSourceIds : undefined;
      const jobResponse = await aiService.generateQuiz(lesson.id, questionCount, sourceIds);
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
  }, [lesson, questionCount, selectedSourceIds, hasMultiSelector]);

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
      const updatedQuestions = quiz.questions.map((q: QuizQuestionDto, i: number) => i === qi ? updated : q);
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

  const canGenerate = hasMultiSelector ? selectedSourceIds.length > 0 : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Quiz Generator" size="lg">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {/* ==================== CONFIG PHASE ==================== */}
        {phase === "config" && (
          <div className="space-y-6">
            {loadingExisting && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            )}

            {/* Source lesson selector — only for QUIZ-type lessons */}
            {hasMultiSelector && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="block text-sm font-medium text-gray-700">Source Lessons</p>
                  {selectedSourceIds.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {selectedSourceIds.length} lesson{selectedSourceIds.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>
                {selectedSourceIds.length === 0 && (
                  <p className="text-xs text-amber-600 mb-2">Select at least one lesson to use as content source.</p>
                )}
                <SourceLessonSelector
                  sections={sections}
                  allLessons={allLessons}
                  selectedIds={selectedSourceIds}
                  onChange={setSelectedSourceIds}
                />
              </div>
            )}

            {lesson && (
              <p className="text-sm text-gray-500">
                Lesson: <span className="font-medium text-gray-700">{lesson.title}</span>
              </p>
            )}

            <div>
              <label htmlFor="quiz-question-count" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="quiz-question-count"
                  type="text"
                  inputMode="numeric"
                  value={questionCountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) setQuestionCountInput(val);
                  }}
                  onBlur={() => {
                    const n = parseInt(questionCountInput, 10);
                    const clamped = isNaN(n) ? 1 : Math.min(50, Math.max(1, n));
                    setQuestionCount(clamped);
                    setQuestionCountInput(String(clamped));
                  }}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg font-medium"
                />
                <span className="text-sm text-gray-500">questions (1 – 50)</span>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-700">
                <strong>How it works:</strong> The AI will read the selected lesson content and
                generate multiple-choice questions with explanations. This may take 5–30 seconds.
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
                disabled={!canGenerate}
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
