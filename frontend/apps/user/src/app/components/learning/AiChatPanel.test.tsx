import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiChatPanel } from './AiChatPanel';
import { aiService } from '../../services/ai.service';
import { useAiChatStore } from '../../stores/aiChat.store';

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('../../services/ai.service', () => ({
  SseStreamError: class SseStreamError extends Error {},
  aiService: {
    chat: vi.fn(),
    chatStream: vi.fn(),
  },
}));

type StreamCallbacks = {
  onChunk: (text: string) => void;
  onMetadata?: (data: {
    sourceLessons: Array<{ lessonId: number; lessonTitle: string }>;
    confidenceTier: 'HIGH' | 'MEDIUM' | 'GAP' | null;
    questionScope: 'IN_SCOPE_IT' | 'OFF_TOPIC';
  }) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
};

describe('AiChatPanel announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiChatStore.setState({ chatsByCourse: {} });
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('keeps message auto-scroll inside the chat panel', async () => {
    const user = userEvent.setup();
    vi.mocked(aiService.chatStream).mockImplementation(async () => undefined);
    useAiChatStore.getState().addMessage(6, { role: 'user', content: 'First question' });
    useAiChatStore.getState().addMessage(6, { role: 'ai', content: 'First answer' });

    render(<AiChatPanel courseId={6} onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' }),
      'Second question',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('opens a cited source lesson when its source button is selected', async () => {
    const user = userEvent.setup();
    const onSelectLesson = vi.fn();
    useAiChatStore.getState().addMessage(10, { role: 'user', content: 'Explain streams' });
    useAiChatStore.getState().addMessage(10, {
      role: 'ai',
      content: 'A stream delivers data incrementally.',
      sourceLessons: [{ lessonId: 42, lessonTitle: 'Reactive Streams' }],
    });

    render(
      <AiChatPanel
        courseId={10}
        onClose={vi.fn()}
        onSelectLesson={onSelectLesson}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open source lesson: Reactive Streams' }),
    );

    expect(onSelectLesson).toHaveBeenCalledOnce();
    expect(onSelectLesson).toHaveBeenCalledWith(42);
  });

  it('announces each hard failure once and keeps Retry outside the alert', async () => {
    const user = userEvent.setup();
    let activeCallbacks: StreamCallbacks | undefined;
    vi.mocked(aiService.chatStream).mockImplementation(
      async (_courseId, _request, callbacks) => {
        activeCallbacks = callbacks;
      },
    );

    render(<AiChatPanel courseId={7} onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' });
    await user.type(input, 'Why is the sky blue?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(aiService.chatStream).toHaveBeenCalledOnce());
    act(() => activeCallbacks?.onError?.(new Response(null, { status: 500 })));

    const firstAlert = await screen.findByRole('alert');
    expect(firstAlert).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    const retry = screen.getByRole('button', { name: 'Retry' });
    await waitFor(() => expect(retry).toHaveFocus());
    expect(within(firstAlert).queryByRole('button')).not.toBeInTheDocument();
    expect(firstAlert).not.toContainElement(retry);

    await user.click(retry);

    await waitFor(() => expect(aiService.chatStream).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument());
    act(() => activeCallbacks?.onError?.(new Response(null, { status: 500 })));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toHaveFocus());

    const messages = useAiChatStore.getState().getMessages(7);
    expect(messages).toEqual([{ role: 'user', content: 'Why is the sky blue?' }]);
    expect(vi.mocked(aiService.chatStream).mock.calls[1][1]).toMatchObject({
      question: 'Why is the sky blue?',
    });
  });

  it('announces a completed response once through the status region', async () => {
    const user = userEvent.setup();
    vi.mocked(aiService.chatStream).mockImplementation(
      async (_courseId, _request, callbacks) => {
        callbacks.onChunk('Because of Rayleigh scattering.');
        callbacks.onClose?.();
      },
    );

    render(<AiChatPanel courseId={8} onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' }),
      'Why is the sky blue?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('AI tutor response ready.');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the server-provided confidence tier instead of inferring it from the answer', async () => {
    const user = userEvent.setup();
    vi.mocked(aiService.chatStream).mockImplementation(
      async (_courseId, _request, callbacks) => {
        callbacks.onChunk('The instructor has not covered this topic.');
        callbacks.onMetadata({
          sourceLessons: [],
          confidenceTier: 'GAP',
          questionScope: 'IN_SCOPE_IT',
        });
        callbacks.onClose?.();
      },
    );

    render(<AiChatPanel courseId={11} onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' }),
      'Explain an uncovered topic',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Not covered in this course')).toBeVisible();
    expect(useAiChatStore.getState().getMessages(11).at(-1)?.confidenceTier).toBe('GAP');
  });

  it('uses question scope to distinguish off-topic answers from knowledge gaps', async () => {
    const user = userEvent.setup();
    vi.mocked(aiService.chatStream).mockImplementation(
      async (_courseId, _request, callbacks) => {
        callbacks.onChunk('Please ask me about this IT course.');
        callbacks.onMetadata({
          sourceLessons: [],
          confidenceTier: null,
          questionScope: 'OFF_TOPIC',
        });
        callbacks.onClose?.();
      },
    );

    render(<AiChatPanel courseId={12} onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' }),
      'What should I cook tonight?',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Outside course scope')).toBeVisible();
    expect(screen.queryByText('Not covered in this course')).not.toBeInTheDocument();
  });

  it('announces a partial stream failure once through the status region', async () => {
    const user = userEvent.setup();
    vi.mocked(aiService.chatStream).mockImplementation(
      async (_courseId, _request, callbacks: StreamCallbacks) => {
        callbacks.onChunk('Partial answer');
        callbacks.onError?.(new Error('connection lost'));
      },
    );

    render(<AiChatPanel courseId={9} onClose={vi.fn()} />);
    await user.type(
      screen.getByRole('textbox', { name: 'Ask the AI Tutor a question' }),
      'Explain this lesson',
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'AI tutor response ended early and may be incomplete.',
      );
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Response may be incomplete. Please try again if needed.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
