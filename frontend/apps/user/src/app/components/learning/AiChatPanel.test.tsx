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
