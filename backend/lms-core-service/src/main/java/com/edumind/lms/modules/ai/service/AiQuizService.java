package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.request.GenerateQuizRequest;
import com.edumind.lms.modules.ai.dto.request.SubmitQuizAttemptRequest;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.dto.response.GeneratedQuizResponse;
import com.edumind.lms.modules.ai.dto.response.QuizAttemptResponse;

import java.util.List;

public interface AiQuizService {
    AiJobResponse requestQuizGeneration(GenerateQuizRequest request, Long userId);
    List<GeneratedQuizResponse> getQuizzesByLesson(Long lessonId, Long userId);
    
    /**
     * Get the latest quiz for a student to take.
     * Returns quiz with questions stripped of correctIndex and explanation.
     * Returns null if no quiz exists for the lesson.
     */
    GeneratedQuizResponse getLatestQuizForStudent(Long lessonId, Long userId);
    
    /**
     * Submit a quiz attempt and get scored results with full question review.
     */
    QuizAttemptResponse submitAttempt(SubmitQuizAttemptRequest request, Long userId);
    
    /**
     * Get all past attempts for a student in a lesson.
     */
    List<QuizAttemptResponse> getMyAttempts(Long lessonId, Long userId);
}
