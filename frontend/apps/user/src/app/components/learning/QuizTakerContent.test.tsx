import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { GeneratedQuizResponse, LessonResponse, QuizAttemptResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import { QuizTakerContent } from './QuizTakerContent';

// A fresh QueryClient per render stands in for a real lesson navigation:
// the component tree (and any query subscriptions) is torn down and
// rebuilt from scratch, same as switching lessons and coming back.
const renderQuiz = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <QuizTakerContent lesson={lesson} />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
};

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../services/ai.service', () => ({
  aiService: {
    getQuizForStudent: vi.fn(),
    getMyAttempts: vi.fn(),
    submitAttempt: vi.fn(),
  },
}));

import { aiService } from '../../services/ai.service';

const lesson = {
  id: 10,
  sectionId: 1,
  courseId: 1,
  title: 'Quiz lesson',
  contentType: ContentType.QUIZ,
  orderIndex: 0,
  isPreview: false,
  isMandatory: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as LessonResponse;

const quiz = {
  id: 1,
  lessonId: 10,
  jobId: 1,
  questionCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  questions: [
    { question: 'What is React?', options: ['React is a library', 'React is a framework'], correctIndex: 0, explanation: 'React is a library.' },
    { question: 'Which hook manages state?', options: ['useState', 'useEffect'], correctIndex: 0, explanation: 'useState manages state.' },
  ],
} as GeneratedQuizResponse;

const passAttempt = {
  id: 5,
  lessonId: 10,
  quizId: 1,
  score: 2,
  total: 2,
  percentage: 100,
  answers: [0, 0],
  completedAt: '2026-01-01T00:00:00.000Z',
  quizQuestions: quiz.questions,
} as QuizAttemptResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(aiService.getQuizForStudent).mockResolvedValue(quiz);
  vi.mocked(aiService.getMyAttempts).mockResolvedValue([]);
});

describe('QuizTakerContent redundant entry (WCAG 3.3.7)', () => {
  it('restores a previously selected answer after the lesson is left and revisited mid-attempt', async () => {
    const user = userEvent.setup();
    const first = renderQuiz();
    await screen.findAllByRole('radio');

    await user.click(screen.getByRole('radio', { name: 'React is a library' }));
    expect(screen.getByRole('radio', { name: 'React is a library' })).toBeChecked();

    // Simulate navigating away from the lesson and back: unmount, then
    // mount a fresh instance (fresh QueryClient) the same way the course
    // player would when the learner returns to this lesson.
    first.unmount();
    renderQuiz();
    await screen.findAllByRole('radio');

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'React is a library' })).toBeChecked();
    });
  });

  it('does not restore stale answers into a new attempt started via Try Again', async () => {
    vi.mocked(aiService.submitAttempt).mockResolvedValue(passAttempt);
    const user = userEvent.setup();
    const first = renderQuiz();
    await screen.findAllByRole('radio');

    await user.click(screen.getByRole('radio', { name: 'React is a library' }));
    await user.click(screen.getByRole('radio', { name: 'useState' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Quiz result' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Try Again' }));
    first.unmount();

    renderQuiz();
    await screen.findAllByRole('radio');

    expect(screen.getByRole('radio', { name: 'React is a library' })).not.toBeChecked();
  });
});
