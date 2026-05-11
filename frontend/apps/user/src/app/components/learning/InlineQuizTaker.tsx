import React, { useState, useEffect, useCallback } from "react";
import type { LessonResponse, GeneratedQuizResponse, QuizAttemptResponse, QuizQuestionDto } from "@edumind/shared-types";
import { Button, Loading } from "@edumind/user-ui";
import { BookOpen, CheckCircle, XCircle, ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { aiService } from "../../services/ai.service";

const PASS_THRESHOLD = 70;

type Phase = "loading" | "no-quiz" | "taking" | "result";

interface InlineQuizTakerProps {
  lesson: LessonResponse;
  onQuizPass?: () => void;
}

export const InlineQuizTaker: React.FC<InlineQuizTakerProps> = ({ lesson, onQuizPass }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<GeneratedQuizResponse | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttemptResponse[]>([]);
  const [showPastAttempts, setShowPastAttempts] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const loadPastAttempts = useCallback(async () => {
    try {
      const attempts = await aiService.getMyAttempts(lesson.id);
      setPastAttempts(attempts);
      return attempts;
    } catch {
      return [];
    }
  }, [lesson.id]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setPhase("loading");
      setQuiz(null);
      setAnswers([]);
      setAttempt(null);
      setExpandedExplanations(new Set());
      setShowPastAttempts(false);

      try {
        const [quizData, attempts] = await Promise.all([
          aiService.getQuizForStudent(lesson.id),
          aiService.getMyAttempts(lesson.id),
        ]);
        if (cancelled) return;

        setPastAttempts(attempts);

        if (!quizData) {
          setPhase("no-quiz");
          return;
        }

        setQuiz(quizData);

        if (attempts.length > 0) {
          setAttempt(attempts[0]);
          setPhase("result");
        } else {
          setAnswers(new Array(quizData.questions.length).fill(-1));
          setPhase("taking");
        }
      } catch {
        if (!cancelled) setPhase("no-quiz");
      }
    };

    init();
    return () => { cancelled = true; };
  }, [lesson.id]);

  const handleAnswerChange = (qi: number, oi: number) => {
    setAnswers(prev => prev.map((a, i) => i === qi ? oi : a));
  };

  const handleSubmit = useCallback(async () => {
    if (!quiz || answers.some(a => a === -1)) return;
    setSubmitting(true);
    try {
      const result = await aiService.submitAttempt({ lessonId: lesson.id, quizId: quiz.id, answers });
      setAttempt(result);
      setPhase("result");
      await loadPastAttempts();
      if (result.percentage >= PASS_THRESHOLD) {
        onQuizPass?.();
      }
    } catch (err: any) {
      alert(err?.message ?? "Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers, lesson.id, loadPastAttempts, onQuizPass]);

  const handleTryAgain = () => {
    if (!quiz) return;
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setAttempt(null);
    setPhase("taking");
  };

  const toggleExplanation = (qi: number) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      next.has(qi) ? next.delete(qi) : next.add(qi);
      return next;
    });
  };

  const allAnswered = quiz && answers.every(a => a !== -1);
  const isPassed = attempt ? attempt.percentage >= PASS_THRESHOLD : false;
  const bestAttemptId = pastAttempts.length > 0
    ? pastAttempts.reduce((best, cur) => cur.percentage > best.percentage ? cur : best).id
    : null;

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loading size="lg" />
        <p className="mt-4 text-gray-600">Loading quiz...</p>
      </div>
    );
  }

  if (phase === "no-quiz") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">No quiz available yet</p>
        <p className="text-sm text-gray-500 mt-1">Your instructor hasn't generated a quiz for this lesson.</p>
      </div>
    );
  }

  if (phase === "taking" && quiz) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500">Answer all {quiz.questions.length} questions below.</p>

        {quiz.questions.map((question: QuizQuestionDto, qIndex: number) => (
          <div key={qIndex} className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              {qIndex + 1}. {question.question}
            </h3>
            <div className="space-y-2">
              {question.options.map((option: string, oIndex: number) => (
                <label
                  key={oIndex}
                  className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name={`q-${qIndex}`}
                    checked={answers[qIndex] === oIndex}
                    onChange={() => handleAnswerChange(qIndex, oIndex)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="min-w-[120px]"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "result" && attempt) {
    return (
      <div className="space-y-6">
        <div className={`rounded-lg p-6 text-white text-center ${
          isPassed ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-orange-500"
        }`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <h3 className="text-2xl font-bold">{attempt.score} / {attempt.total}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold tracking-wide ${
              isPassed ? "bg-green-700/50 text-green-100" : "bg-red-700/50 text-red-100"
            }`}>
              {isPassed ? "PASSED ✓" : "FAILED"}
            </span>
          </div>
          <p className="text-lg opacity-90">{attempt.percentage}%</p>
          <p className="text-sm opacity-75 mt-1">
            {isPassed ? "Great job! You passed the quiz." : `You need ${PASS_THRESHOLD}% to pass. Keep trying!`}
          </p>
        </div>

        <div className="space-y-4">
          {attempt.quizQuestions.map((question: QuizQuestionDto, qIndex: number) => {
            const userAnswer = attempt.answers[qIndex];
            const correctAnswer = question.correctIndex;
            const isCorrect = userAnswer === correctAnswer;

            return (
              <div key={qIndex} className={`border rounded-lg p-4 ${
                isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex-1">{qIndex + 1}. {question.question}</h3>
                  {isCorrect
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />}
                </div>

                <div className="space-y-2 mb-3">
                  {question.options.map((option: string, oIndex: number) => {
                    const isUserChoice = oIndex === userAnswer;
                    const isCorrectChoice = oIndex === correctAnswer;
                    return (
                      <div key={oIndex} className={`p-3 border rounded-md ${
                        isCorrectChoice ? "bg-green-100 border-green-300"
                          : isUserChoice && !isCorrect ? "bg-red-100 border-red-300"
                          : "bg-white border-gray-200"
                      }`}>
                        <div className="flex items-center gap-2">
                          {isCorrectChoice && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                          {isUserChoice && !isCorrect && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                          <span className="text-gray-700">{option}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {question.explanation && (
                  <div>
                    <button
                      onClick={() => toggleExplanation(qIndex)}
                      className="flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {expandedExplanations.has(qIndex) ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      {expandedExplanations.has(qIndex) ? "Hide" : "Show"} Explanation
                    </button>
                    {expandedExplanations.has(qIndex) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                        {question.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowPastAttempts(!showPastAttempts)}>
            {showPastAttempts ? "Hide" : "View"} Past Attempts
          </Button>
          <Button variant="secondary" onClick={handleTryAgain}>
            Try Again
          </Button>
        </div>

        {showPastAttempts && pastAttempts.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-3">Past Attempts</h4>
            <div className="space-y-2">
              {pastAttempts.map(past => {
                const isBest = past.id === bestAttemptId;
                return (
                  <div key={past.id} className={`flex items-center justify-between p-2 rounded border ${
                    isBest ? "bg-yellow-50 border-yellow-300" : "bg-white border-gray-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {isBest && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                      <span className="text-sm text-gray-600">{new Date(past.completedAt).toLocaleString()}</span>
                      {isBest && <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Best</span>}
                    </div>
                    <span className={`font-medium ${past.percentage >= PASS_THRESHOLD ? "text-green-700" : "text-red-600"}`}>
                      {past.score} / {past.total} ({past.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
