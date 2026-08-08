import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import type { GeneratedQuizResponse, LessonResponse, QuizAttemptResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import { ArticleViewer } from './ArticleViewer';
import { InlineQuizTaker } from './InlineQuizTaker';
import { QuizTakerModal } from './QuizTakerModal';

// Quiz components now read/write quiz data through TanStack Query (see
// useQuiz.ts) for caching, so tests need a real QueryClientProvider. A fresh
// client per render keeps each test's cache isolated.
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const assertNoSeriousViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, { resultTypes: ['violations'] });
  expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
};

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Loading: () => <div>Loading...</div>,
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title?: string }) =>
    isOpen ? <div role="dialog" aria-label={title ?? 'Dialog'}>{children}</div> : null,
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

type Flow = {
  name: string;
  render: () => Promise<{ container: HTMLElement; user: UserEvent }>;
};

const flows: Flow[] = [
  {
    name: 'InlineQuizTaker',
    render: async () => {
      const user = userEvent.setup();
      const result = renderWithQueryClient(<InlineQuizTaker lesson={lesson} />);
      await screen.findAllByRole('radio');
      return { container: result.container, user };
    },
  },
  {
    name: 'QuizTakerModal',
    render: async () => {
      const user = userEvent.setup();
      const result = renderWithQueryClient(<QuizTakerModal isOpen onClose={vi.fn()} lesson={lesson} />);
      await screen.findAllByRole('radio');
      return { container: result.container, user };
    },
  },
];

const answerEverything = async (user: UserEvent) => {
  await user.click(screen.getByRole('radio', { name: 'React is a library' }));
  await user.click(screen.getByRole('radio', { name: 'useState' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(aiService.getQuizForStudent).mockResolvedValue(quiz);
  vi.mocked(aiService.getMyAttempts).mockResolvedValue([]);
});

describe('ArticleViewer', () => {
  const richHtml = `
    <h1>Accessible React</h1>
    <h2>Why accessibility</h2>
    <ul>
      <li>Semantic HTML</li>
      <li>Keyboard support</li>
    </ul>
    <ol>
      <li>Audit</li>
      <li>Remediate</li>
    </ol>
    <ul>
      <li>Outer
        <ul>
          <li>Nested item</li>
        </ul>
      </li>
    </ul>
    <pre data-language="typescript"><code class="language-typescript">const value: number = 1;</code></pre>
  `;

  it('passes axe for a text lesson', async () => {
    const { container } = render(<ArticleViewer html={richHtml} title="Lesson Content" />);
    await assertNoSeriousViolations(container);
  });

  it('preserves heading hierarchy, ordered/unordered lists and nested list items', () => {
    render(<ArticleViewer html={richHtml} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Accessible React' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Why accessibility' })).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(4);
    const listitems = screen.getAllByRole('listitem');
    expect(listitems).toHaveLength(6);
    expect(screen.getByText('Semantic HTML')).toBeInTheDocument();
    expect(screen.getByText('Keyboard support')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Remediate')).toBeInTheDocument();
    const outer = listitems.find((li) => li.textContent?.includes('Outer'))!;
    expect(outer.querySelector('li')).toHaveTextContent('Nested item');
  });

  it('converts BlockNote heading metadata into native heading roles', () => {
    const html = `
      <p data-content-type="heading" data-level="1">Course overview</p>
      <p data-content-type="heading" data-level="5">Fine detail</p>
    `;
    render(<ArticleViewer html={html} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Course overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: 'Fine detail' })).toBeInTheDocument();
  });

  it('gives code blocks a region name containing the language', () => {
    const { container } = render(<ArticleViewer html={richHtml} />);
    expect(screen.getByRole('region', { name: 'Code example, typescript' })).toBeInTheDocument();
    expect(container.querySelector('pre')).not.toHaveAttribute('lang');
  });

  it('uses language-not-specified context when no language metadata is present', () => {
    render(<ArticleViewer html={'<pre><code>bare code</code></pre>'} />);
    expect(screen.getByRole('region', { name: 'Code example, language not specified' })).toBeInTheDocument();
  });

  it.each(['python', 'java', 'go', 'js'])(
    'does not infer HTML lang from %s and keeps the code region named',
    async (language) => {
      const { container } = render(
        <ArticleViewer
          html={`<pre class="language-${language}"><code>sample code</code></pre>`}
        />,
      );
      const region = screen.getByRole('region', { name: `Code example, ${language}` });
      expect(region).toHaveTextContent('sample code');
      expect(container.querySelector('pre')).not.toHaveAttribute('lang');
      await assertNoSeriousViolations(container);
    },
  );

  it('removes author-provided programming-language lang from pre and code', () => {
    const { container } = render(
      <ArticleViewer
        html={'<pre lang="python"><code class="language-python" lang="python">print("hello")</code></pre>'}
      />,
    );

    expect(screen.getByRole('region', { name: 'Code example, python' })).toBeInTheDocument();
    expect(container.querySelector('pre')).not.toHaveAttribute('lang');
    expect(container.querySelector('code')).not.toHaveAttribute('lang');
  });
});

describe.each(flows)('$name quiz accessibility', ({ render: renderFlow }) => {
  it('passes axe for the taking state', async () => {
    const { container } = await renderFlow();
    await assertNoSeriousViolations(container);
  });

  it('renders each question as a fieldset with a legend', async () => {
    await renderFlow();

    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAccessibleName('1. What is React?');
    expect(groups[1]).toHaveAccessibleName('2. Which hook manages state?');
  });

  it('groups options as a keyboard-operable radio set within each question', async () => {
    await renderFlow();

    const q1Radios = screen.getAllByRole('radio');
    const q1Name = q1Radios[0].getAttribute('name');
    const q2Radios = screen.getAllByRole('radio').slice(2);
    expect(q2Radios.every((r) => r.getAttribute('name') !== q1Name)).toBe(true);

    await userEvent.setup().click(screen.getByRole('radio', { name: 'React is a framework' }));
    expect(screen.getByRole('radio', { name: 'React is a framework' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'React is a library' })).not.toBeChecked();
  });

  it('prevents incomplete submission and focuses/announces validation', async () => {
    const { user, container } = await renderFlow();

    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Answer every question before submitting.');
    const firstGroup = screen.getAllByRole('group')[0];
    expect(container.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(firstGroup);
  });

  it('disables duplicate submission while the request is in flight', async () => {
    let resolveAttempt!: (value: QuizAttemptResponse) => void;
    vi.mocked(aiService.submitAttempt).mockReturnValue(
      new Promise<QuizAttemptResponse>((resolve) => { resolveAttempt = resolve; }),
    );
    const { user } = await renderFlow();
    await answerEverything(user);

    const submit = screen.getByRole('button', { name: 'Submit quiz' });
    await user.click(submit);
    await user.click(submit);

    expect(aiService.submitAttempt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit quiz' })).toBeDisabled());

    resolveAttempt(passAttempt);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Quiz result' })).toBeInTheDocument());
  });

  it('announces score and Passed/Failed result', async () => {
    vi.mocked(aiService.submitAttempt).mockResolvedValue(passAttempt);
    const { user } = await renderFlow();
    await answerEverything(user);

    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Quiz result');
      expect(status).toHaveTextContent('2 / 2');
      expect(status).toHaveTextContent('100%');
      expect(status).toHaveTextContent('PASSED');
    });
  });

  it('renders a persistent submit error with a named retry action', async () => {
    vi.mocked(aiService.submitAttempt).mockRejectedValueOnce(new Error('Service unavailable'));
    const { user } = await renderFlow();
    await answerEverything(user);

    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Service unavailable');
    expect(screen.getByRole('button', { name: 'Retry quiz submission' })).toBeInTheDocument();

    vi.mocked(aiService.submitAttempt).mockResolvedValue(passAttempt);
    await user.click(screen.getByRole('button', { name: 'Retry quiz submission' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Quiz result' })).toBeInTheDocument());
  });

  it('passes axe for the result state', async () => {
    vi.mocked(aiService.submitAttempt).mockResolvedValue(passAttempt);
    const { user, container } = await renderFlow();
    await answerEverything(user);

    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Quiz result' })).toBeInTheDocument());

    await assertNoSeriousViolations(container);
  });
});
