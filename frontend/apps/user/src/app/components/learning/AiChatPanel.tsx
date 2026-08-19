import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@edumind/user-ui';
import { Sparkles, MessageCircle, Loader2, X, Copy, Check } from 'lucide-react';
import { aiService, SseStreamError } from '../../services/ai.service';
import type {
  ChatRequest,
  ChatResponse,
  ConversationTurn,
  SourceLessonDto,
} from '@edumind/shared-types';
import { useAiChatStore, type AiChatMessage } from '../../stores/aiChat.store';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// ─── Sub-components ──────────────────────────────────────────────────────────

const CodeBlock = React.memo(function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden text-[13px]">
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5">
        <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', lineHeight: '1.6' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

// Stable module-level constant — prevents ReactMarkdown from re-rendering
// its internals due to a new `components` object reference each render.
const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    if (!match) {
      return (
        <code
          className="bg-gray-100 text-indigo-700 rounded px-1 py-0.5 text-[13px] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
    );
  },
};

const AiAvatar = (
  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
    <Sparkles className="w-4 h-4 text-indigo-600" />
  </div>
);

const aiBubbleClass =
  'min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ' +
  'bg-white text-gray-800 border border-gray-100 rounded-bl-sm ' +
  'prose prose-sm prose-indigo max-w-none [&_pre]:overflow-x-auto [&_pre]:max-w-full';

// Source lessons badge list
const SourceLessons = React.memo(function SourceLessons({
  lessons,
}: {
  lessons: SourceLessonDto[];
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
      <span className="text-[11px] text-gray-500 font-medium mr-1 uppercase tracking-wider">
        Sources:
      </span>
      {lessons.map((lesson) => (
        <span
          key={lesson.lessonId}
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors"
        >
          {lesson.lessonTitle}
        </span>
      ))}
    </div>
  );
});

// Memoized user bubble — stable props during streaming → skips re-render.
const UserMessageBubble = React.memo(function UserMessageBubble({
  content,
  isLastUser,
  msgRef,
  isPairStart,
}: {
  content: string;
  isLastUser: boolean;
  msgRef: React.RefObject<HTMLDivElement | null>;
  isPairStart: boolean;
}) {
  return (
    <div
      ref={isLastUser ? msgRef : undefined}
      className={`flex justify-end${isPairStart ? ' mt-3' : ''}`}
    >
      <div className="min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm bg-indigo-600 text-white rounded-br-sm">
        <span className="sr-only">You: </span>
        <p className="whitespace-pre-wrap m-0">{content}</p>
      </div>
    </div>
  );
});

// Memoized completed AI bubble — won't re-render during the 60fps streaming ticks.
const CompletedAiMessageBubble = React.memo(function CompletedAiMessageBubble({
  msg,
}: {
  msg: AiChatMessage;
}) {
  return (
    <div className="flex justify-start">
      {AiAvatar}
      <div className={aiBubbleClass}>
        <span className="sr-only">AI: </span>
        <div className="text-gray-800 break-words w-full">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.sourceLessons && msg.sourceLessons.length > 0 && (
          <SourceLessons lessons={msg.sourceLessons} />
        )}
      </div>
    </div>
  );
});

// Streaming AI bubble — intentionally not memoized; re-renders every typewriter tick,
// but only this single component re-renders (not the whole list).
function StreamingAiMessageBubble({
  displayText,
  sourceLessons,
}: {
  displayText: string;
  sourceLessons?: SourceLessonDto[];
}) {
  const isWaiting = displayText === '';
  return (
    <div className="flex justify-start">
      {AiAvatar}
      <div className={aiBubbleClass}>
        <span className="sr-only">AI: </span>
        {isWaiting ? (
          <div className="flex items-center gap-1 py-1">
            <span className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce motion-reduce:animate-none" />
          </div>
        ) : (
          <div className="text-gray-800 break-words w-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {displayText}
            </ReactMarkdown>
            <span className="inline-block w-[7px] h-[1em] ml-[1px] align-baseline bg-gray-400 animate-pulse motion-reduce:animate-none" />
          </div>
        )}
        {sourceLessons && sourceLessons.length > 0 && (
          <SourceLessons lessons={sourceLessons} />
        )}
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface AiChatPanelProps {
  courseId: number;
  onClose: () => void;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({ courseId, onClose }) => {
  const panelRef = useFocusTrap(true, onClose);
  const storedMessages = useAiChatStore(
    (state) => state.chatsByCourse[courseId.toString()]
  );
  const messages = storedMessages ?? [];
  const addMessage = useAiChatStore((state) => state.addMessage);
  const removeLastMessage = useAiChatStore((state) => state.removeLastMessage);
  const updateLastAiMessage = useAiChatStore((state) => state.updateLastAiMessage);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Announced once via aria-live when a stream finishes — screen reader users
  // get a single "done" cue instead of being read every typewriter tick.
  const [announcement, setAnnouncement] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastUserMsgRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevIsLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Grows the textarea with its content up to max-h-24 since it's rows={1}
  // and resize-none — the browser won't do this on its own.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  // Typewriter: targetTextRef accumulates raw SSE text; setInterval drips it into
  // streamingDisplayText so large backend chunks feel smooth.
  const targetTextRef = useRef('');
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamingDisplayText, setStreamingDisplayText] = useState('');

  // O(n) once — replaces the previous O(n²) .slice().every() per-item check.
  const lastUserMsgIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  }, [messages]);

  const scrollToLastQuestion = () => {
    if (lastUserMsgRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const msgEl = lastUserMsgRef.current;
      const containerRect = container.getBoundingClientRect();
      const msgRect = msgEl.getBoundingClientRect();
      container.scrollTop += msgRect.top - containerRect.top;
    }
  };

  // On open: scroll so the last user question is at the top
  useEffect(() => {
    inputRef.current?.focus();
    const timer = setTimeout(scrollToLastQuestion, 0);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While chatting
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (wasLoading && !isLoading) {
      timer = setTimeout(scrollToLastQuestion, 0);
    }

    if (messages.length > prevMessagesLengthRef.current || isLoading) {
      prevMessagesLengthRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [messages, isLoading]);

  // Auto-scroll to bottom as typewriter drips out text
  useEffect(() => {
    if (!isLoading || !streamingDisplayText || !messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    el.scrollTop = el.scrollHeight;
  }, [streamingDisplayText, isLoading]);

  // Prevent body scroll on mobile while chat is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    if (window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const buildRecentHistory = (): ConversationTurn[] => {
    const pairs: ConversationTurn[] = [];
    for (let i = 0; i + 1 < messages.length; i += 2) {
      const userMsg = messages[i];
      const aiMsg = messages[i + 1];
      if (userMsg.role === 'user' && aiMsg.role === 'ai') {
        pairs.push({ question: userMsg.content, answer: aiMsg.content });
      }
    }
    return pairs.slice(-4);
  };

  // Retries resend the same question without re-adding a duplicate user bubble —
  // lastFailedQuestion is only populated on a hard failure (see failWith below).
  // Kept as state (not a ref) so its appearance can drive a focus-management effect.
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sending disables the textarea/button, which blurs focus to <body> if either was
  // focused when Enter/Send was pressed. Move focus back somewhere useful once the
  // request settles: onto Retry when the request failed hard, otherwise back to the
  // input — never leave focus stranded outside the panel.
  const wasLoadingForFocusRef = useRef(false);
  useEffect(() => {
    const wasLoading = wasLoadingForFocusRef.current;
    wasLoadingForFocusRef.current = isLoading;
    if (!wasLoading || isLoading) return;

    if (lastFailedQuestion) {
      retryButtonRef.current?.focus();
    } else if (!panelRef.current?.contains(document.activeElement)) {
      inputRef.current?.focus();
    }
  }, [isLoading, lastFailedQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  const runChatRequest = (trimmed: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    targetTextRef.current = '';
    setStreamingDisplayText('');

    const aiPlaceholder: AiChatMessage = { role: 'ai', content: '' };
    addMessage(courseId, aiPlaceholder);

    setIsLoading(true);
    setError(null);
    setAnnouncement('');
    setLastFailedQuestion(null);

    let receivedChunks = false;

    const recentHistory = buildRecentHistory();
    const payload: ChatRequest = {
      question: trimmed,
      recentHistory: recentHistory.length > 0 ? recentHistory : undefined,
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // A hard failure drops the empty AI placeholder bubble (nothing was ever produced
    // for it) and records the question so the Retry action can resend it.
    const failWith = (message: string) => {
      removeLastMessage(courseId);
      setLastFailedQuestion(trimmed);
      setError(message);
      setIsLoading(false);
      abortControllerRef.current = null;
    };

    aiService
      .chatStream(courseId, payload, {
        signal: controller.signal,
        onChunk: (text: string) => {
          receivedChunks = true;
          targetTextRef.current += text;

          if (!typewriterIntervalRef.current) {
            typewriterIntervalRef.current = setInterval(() => {
              setStreamingDisplayText((prev) => {
                const target = targetTextRef.current;
                if (prev.length >= target.length) return prev;
                const remaining = target.length - prev.length;
                const charsThisTick = remaining > 80 ? Math.min(remaining, 12) : 3;
                return target.slice(0, prev.length + charsThisTick);
              });
            }, 16); // ~60fps
          }
        },
        onMetadata: (data) => {
          updateLastAiMessage(courseId, (prev) => ({
            ...prev,
            sourceLessons: data.sourceLessons ?? prev.sourceLessons,
          }));
        },
        onError: (err: unknown) => {
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
            typewriterIntervalRef.current = null;
          }
          targetTextRef.current = '';
          setStreamingDisplayText('');

          if (err instanceof Response) {
            if (err.status === 429) {
              failWith('Daily question limit reached (20/day). Try again tomorrow.');
            } else if (err.status === 401) {
              failWith('Your session has expired. Please refresh the page and log in again.');
            } else if (err.status === 403) {
              failWith("You don't have access to AI chat for this course.");
            } else {
              failWith('Something went wrong. Please try again.');
            }
            return;
          }

          if (err instanceof SseStreamError) {
            failWith(err.message || 'Something went wrong. Please try again.');
            return;
          }

          if (receivedChunks) {
            setError('Response may be incomplete. Please try again if needed.');
            setAnnouncement('AI tutor response ended early and may be incomplete.');
            setIsLoading(false);
            abortControllerRef.current = null;
            return;
          }

          void (async () => {
            try {
              const response: ChatResponse = await aiService.chat(courseId, payload);
              updateLastAiMessage(courseId, (prev) => ({
                ...prev,
                content: response.answer,
                sourceLessons: response.sourceLessons,
              }));
              setError(null);
              setAnnouncement('AI tutor response ready.');
              setIsLoading(false);
              abortControllerRef.current = null;
            } catch (fallbackErr: unknown) {
              const status = (fallbackErr as { response?: { status?: number } })?.response?.status;
              if (status === 429) {
                failWith('Daily question limit reached (20/day). Try again tomorrow.');
              } else if (status === 403) {
                failWith("You don't have access to AI chat for this course.");
              } else {
                failWith('Something went wrong. Please try again.');
              }
            }
          })();
        },
        onClose: () => {
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
            typewriterIntervalRef.current = null;
          }
          const finalText = targetTextRef.current;
          updateLastAiMessage(courseId, (prev) => ({ ...prev, content: finalText }));
          targetTextRef.current = '';
          setStreamingDisplayText('');
          setIsLoading(false);
          setAnnouncement('AI tutor response ready.');
          abortControllerRef.current = null;
        },
      })
      .catch(() => {
        // Errors handled in onError
      });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: AiChatMessage = { role: 'user', content: trimmed };
    addMessage(courseId, userMessage);
    setInput('');
    runChatRequest(trimmed);
  };

  const handleRetry = () => {
    const trimmed = lastFailedQuestion;
    if (!trimmed || isLoading) return;
    runChatRequest(trimmed);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseClick = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    onClose();
  };

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  return (
    <div
      id="ai-course-tutor-dialog"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-course-tutor-title"
      aria-describedby="ai-course-tutor-description"
      className="fixed inset-x-0 bottom-0 top-16 z-50 flex h-[calc(100dvh-4rem)] min-h-0 w-full max-w-none flex-col overflow-hidden border bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[520px] sm:max-h-[calc(100dvh-6rem)] sm:w-96 sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl md:right-[336px]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 [@media(max-height:32rem)]:px-3 [@media(max-height:32rem)]:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-full bg-indigo-50 p-2 [@media(max-height:32rem)]:p-1.5">
            <Sparkles aria-hidden="true" className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 id="ai-course-tutor-title" className="font-semibold text-gray-900 flex items-center gap-2">
              AI Tutor
              <MessageCircle aria-hidden="true" className="w-4 h-4 text-gray-500" />
            </h3>
            <p id="ai-course-tutor-description" className="text-xs text-gray-500 [@media(max-height:32rem)]:sr-only">
              Ask questions about this course. Answers are based on the course lessons.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label="Close AI Tutor"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X aria-hidden="true" className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-gray-50 px-4 py-3 [@media(max-height:32rem)]:p-2"
      >
        {messages.length === 0 && !isLoading && (
          <p className="text-sm text-gray-500">
            Ask me anything about this course&apos;s content...
          </p>
        )}

        {messages.map((msg, index) => {
          const isStreamingThisMessage =
            msg.role === 'ai' && isLoading && index === messages.length - 1;

          // Skip stale empty AI placeholder left by an aborted stream
          if (msg.role === 'ai' && msg.content === '' && !isStreamingThisMessage) {
            return null;
          }

          if (msg.role === 'user') {
            return (
              <UserMessageBubble
                key={index}
                content={msg.content}
                isLastUser={index === lastUserMsgIndex}
                msgRef={lastUserMsgRef}
                isPairStart={index > 0}
              />
            );
          }

          // AI messages
          if (isStreamingThisMessage) {
            return (
              <StreamingAiMessageBubble
                key={index}
                displayText={streamingDisplayText}
                sourceLessons={msg.sourceLessons}
              />
            );
          }

          return <CompletedAiMessageBubble key={index} msg={msg} />;
        })}

        <div ref={bottomRef} />
      </div>

      {/* Announced once when a stream finishes — not wrapped around the streaming
          bubble itself, so token-by-token updates are never read aloud. */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 px-4 mb-2">
          <p role={lastFailedQuestion ? 'alert' : undefined} className="text-xs text-red-600 m-0">{error}</p>
          {lastFailedQuestion && (
            <button
              ref={retryButtonRef}
              type="button"
              onClick={handleRetry}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline flex-shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex min-w-0 flex-shrink-0 items-end gap-2 border-t bg-white px-4 py-3 [@media(max-height:32rem)]:p-2">
        <textarea
          ref={inputRef}
          aria-label="Ask the AI Tutor a question"
          rows={1}
          className="min-h-11 min-w-0 max-h-24 flex-1 resize-none overflow-y-auto rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 [@media(max-height:32rem)]:max-h-12"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={isLoading}
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="flex h-11 flex-shrink-0 items-center gap-1 [@media(max-height:32rem)]:px-3 [@media(max-height:32rem)]:py-2 [@media(max-height:32rem)]:h-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              Sending
            </>
          ) : (
            <>Send</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AiChatPanel;
