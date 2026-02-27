import { apiClient } from "./api-client.service";
import {
  AiJobResponseSchema,
  GeneratedQuizListResponseSchema,
  GeneratedQuizResponseSchema,
  QuizAttemptResponseSchema,
  QuizAttemptListResponseSchema,
  SubmitQuizAttemptRequestSchema,
  AiJobStatus,
  type AiJobResponse,
  type GeneratedQuizResponse,
  type QuizAttemptResponse,
  type SubmitQuizAttemptRequest,
  LessonSummaryResponseSchema,
  type LessonSummaryResponse,
  ChatResponseSchema,
  type ChatRequest,
  type ChatResponse,
  type SourceLessonDto,
} from "@edumind/shared-types";
import { AI_ENDPOINTS, buildApiUrl } from "@edumind/shared-utils";

/**
 * Signals a server-side SSE error event (as opposed to a network/connection error).
 * Used in AiChatPanel to distinguish "server said error" from "network died".
 */
export class SseStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SseStreamError";
  }
}

export const aiService = {
  async generateQuiz(lessonId: number, questionCount: number): Promise<AiJobResponse> {
    const response = await apiClient.post<AiJobResponse>(AI_ENDPOINTS.QUIZ_GENERATE, {
      lessonId,
      questionCount,
    });
    return AiJobResponseSchema.parse(response.data);
  },

  async getJobStatus(jobId: number): Promise<AiJobResponse> {
    const response = await apiClient.get<AiJobResponse>(AI_ENDPOINTS.JOB_STATUS(jobId));
    return AiJobResponseSchema.parse(response.data);
  },

  async getQuizzesByLesson(lessonId: number): Promise<GeneratedQuizResponse[]> {
    const response = await apiClient.get<GeneratedQuizResponse[]>(
      AI_ENDPOINTS.QUIZZES_BY_LESSON(lessonId)
    );
    return GeneratedQuizListResponseSchema.parse(response.data);
  },

  /**
   * Get the latest quiz for a student to take.
   * Returns quiz with questions (without correct answers) or null if no quiz exists.
   */
  async getQuizForStudent(lessonId: number): Promise<GeneratedQuizResponse | null> {
    const response = await apiClient.get<GeneratedQuizResponse | null>(
      AI_ENDPOINTS.QUIZ_FOR_STUDENT(lessonId)
    );
    if (!response.data) {
      return null;
    }
    return GeneratedQuizResponseSchema.parse(response.data);
  },

  /**
   * Submit a quiz attempt and get scored results with full question review.
   */
  async submitAttempt(request: SubmitQuizAttemptRequest): Promise<QuizAttemptResponse> {
    const response = await apiClient.post<QuizAttemptResponse>(
      AI_ENDPOINTS.SUBMIT_ATTEMPT,
      SubmitQuizAttemptRequestSchema.parse(request)
    );
    return QuizAttemptResponseSchema.parse(response.data);
  },

  /**
   * Get all past attempts for a student in a lesson.
   */
  async getMyAttempts(lessonId: number): Promise<QuizAttemptResponse[]> {
    const response = await apiClient.get<QuizAttemptResponse[]>(
      AI_ENDPOINTS.MY_ATTEMPTS(lessonId)
    );
    return QuizAttemptListResponseSchema.parse(response.data);
  },

  async getSummaryByLesson(lessonId: number): Promise<LessonSummaryResponse | null> {
    try {
      const response = await apiClient.get<LessonSummaryResponse>(
        AI_ENDPOINTS.SUMMARY_BY_LESSON(lessonId)
      );
      if (!response.data) return null;
      return LessonSummaryResponseSchema.parse(response.data);
    } catch {
      // 404 = not yet generated; silently return null
      return null;
    }
  },

  async chat(courseId: number, request: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>(
      AI_ENDPOINTS.CHAT(courseId),
      request
    );
    return ChatResponseSchema.parse(response.data);
  },

  async chatStream(
    courseId: number,
    request: ChatRequest,
    callbacks: {
      onChunk: (text: string) => void;
      onMetadata: (data: { sourceLessons: SourceLessonDto[]; confidenceTier: string }) => void;
      onError?: (error: unknown) => void;
      onClose?: () => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    const { onChunk, onMetadata, onError, onClose, signal } = callbacks;

    const url = buildApiUrl(AI_ENDPOINTS.CHAT_STREAM(courseId));
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
        credentials: "include",
        signal,
      });
    } catch (err) {
      onError?.(err);
      return;
    }

    if (!response.ok) {
      onError?.(response);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    let dataLines: string[] = [];

    const dispatchEvent = () => {
      if (dataLines.length === 0) return;
      // Join multi-line data fields per SSE spec
      const data = dataLines.join("\n");
      dataLines = [];

      if (eventType === "metadata") {
        try {
          onMetadata(JSON.parse(data) as { sourceLessons: SourceLessonDto[]; confidenceTier: string });
        } catch (e) {
          onError?.(e);
        }
      } else if (eventType === "error") {
        try {
          const parsed = JSON.parse(data) as { message: string };
          onError?.(new SseStreamError(parsed.message ?? "AI stream error"));
        } catch {
          onError?.(new SseStreamError("AI stream error"));
        }
      } else if (data) {
        onChunk(data);
      }

      eventType = "";
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line === "" || line === "\r") {
            // Blank line = end of event, dispatch it
            dispatchEvent();
          } else if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            // Use slice(5) — NOT slice(6) — to preserve the token's leading space.
            // The SSE spec strips one leading space, but LLM tokens often start with a
            // space (e.g., " distinguishes"). Spring sends these as `data: distinguishes`
            // which the spec would strip to "distinguishes", merging words incorrectly.
            // By taking everything after "data:" we keep " distinguishes" intact.
            dataLines.push(line.slice(5));
          }
          // Ignore id:, retry:, and comment lines
        }
      }
      // Dispatch any buffered event at end of stream
      dispatchEvent();
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        onClose?.();
        return;
      }
      onError?.(err);
      return;
    }

    onClose?.();
  },
};

export function pollJobUntilDone(
  jobId: number,
  onTick: (job: AiJobResponse) => void,
  intervalMs = 2000
): Promise<AiJobResponse> {
  return new Promise((resolve, reject) => {
    const id = setInterval(async () => {
      try {
        const job = await aiService.getJobStatus(jobId);
        onTick(job);
        if (job.status === AiJobStatus.COMPLETED || job.status === AiJobStatus.FAILED) {
          clearInterval(id);
          resolve(job);
        }
      } catch (err) {
        clearInterval(id);
        reject(err);
      }
    }, intervalMs);
  });
}
