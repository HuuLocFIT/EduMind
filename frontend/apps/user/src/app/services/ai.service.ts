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
} from "@edumind/shared-types";
import { AI_ENDPOINTS } from "@edumind/shared-utils";

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
