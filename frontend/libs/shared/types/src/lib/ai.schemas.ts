import { z } from "zod";

export enum AiJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export const AiJobStatusSchema = z.nativeEnum(AiJobStatus);

export const AiJobResponseSchema = z.object({
  jobId: z.number(),
  jobType: z.string(),
  status: AiJobStatusSchema,
  userId: z.number(),
  referenceId: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const QuizQuestionDtoSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().nullable().optional(),  // Optional/nullable for student view (hidden until after submit)
  explanation: z.string().nullable().optional(),   // Optional/nullable for student view (hidden until after submit)
});

export const GeneratedQuizResponseSchema = z.object({
  id: z.number(),
  lessonId: z.number(),
  jobId: z.number(),
  questionCount: z.number(),
  questions: z.array(QuizQuestionDtoSchema),
  createdAt: z.string(),
});

export const GenerateQuizRequestSchema = z.object({
  lessonId: z.number(),
  questionCount: z.number().min(1).max(20).default(5),
});

export const GeneratedQuizListResponseSchema = z.array(GeneratedQuizResponseSchema);

export const SubmitQuizAttemptRequestSchema = z.object({
  lessonId: z.number(),
  quizId: z.number(),
  answers: z.array(z.number()),  // Array of answer indices matching question order
});

export const QuizAttemptResponseSchema = z.object({
  id: z.number(),
  lessonId: z.number(),
  quizId: z.number(),
  score: z.number(),
  total: z.number(),
  percentage: z.number(),  // Calculated: Math.round(score / total * 100)
  answers: z.array(z.number()),  // Array of chosen answer indices
  completedAt: z.string(),
  quizQuestions: z.array(QuizQuestionDtoSchema),  // Full questions with correctIndex and explanation for review
});

export const QuizAttemptListResponseSchema = z.array(QuizAttemptResponseSchema);

export type AiJobResponse = z.infer<typeof AiJobResponseSchema>;
export type QuizQuestionDto = z.infer<typeof QuizQuestionDtoSchema>;
export type GeneratedQuizResponse = z.infer<typeof GeneratedQuizResponseSchema>;
export type GenerateQuizRequest = z.infer<typeof GenerateQuizRequestSchema>;
export type SubmitQuizAttemptRequest = z.infer<typeof SubmitQuizAttemptRequestSchema>;
export type QuizAttemptResponse = z.infer<typeof QuizAttemptResponseSchema>;