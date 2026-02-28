package com.edumind.lms.modules.ai.service;

import com.edumind.lms.modules.ai.dto.request.GenerateQuizRequest;
import com.edumind.lms.modules.ai.dto.request.SubmitQuizAttemptRequest;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.dto.response.GeneratedQuizResponse;
import com.edumind.lms.modules.ai.dto.response.QuizAttemptResponse;
import com.edumind.lms.modules.ai.dto.response.QuizQuestionDto;
import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.entity.GeneratedQuiz;
import com.edumind.lms.modules.ai.entity.QuizAttempt;
import com.edumind.lms.modules.ai.repository.GeneratedQuizRepository;
import com.edumind.lms.modules.ai.repository.QuizAttemptRepository;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.dto.LessonInfo;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiQuizServiceImpl implements AiQuizService {

    private final LessonQueryService lessonQueryService;
    private final EnrollmentQueryService enrollmentQueryService;
    private final AiJobService aiJobService;
    private final GeneratedQuizRepository generatedQuizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AsyncQuizProcessor asyncQuizProcessor;
    private final ObjectMapper objectMapper;

    private static final TypeReference<List<QuizQuestionDto>> QUIZ_TYPE_REF = new TypeReference<>() {};

    @Override
    @Transactional
    public AiJobResponse requestQuizGeneration(GenerateQuizRequest request, Long userId) {
        // 1. Load lesson via ACL
        LessonInfo lessonInfo = lessonQueryService.getLessonInfo(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + request.getLessonId()));

        // 2. Ownership check
        if (!lessonInfo.instructorId().equals(userId)) {
            throw new UnauthorizedException("You do not own this lesson's course");
        }

        // 3. Content validation
        if (lessonInfo.articleContent() == null || lessonInfo.articleContent().isBlank()) {
            throw new BadRequestException("Lesson has no article content to generate a quiz from");
        }

        // 4. Create tracking job
        AiJobLog job = aiJobService.createJob(
                com.edumind.lms.modules.ai.enums.AiJobType.QUIZ_GENERATION,
                userId,
                lessonInfo.id()
        );

        // 5. Fire async (via separate @Component bean — avoids Spring proxy self-invocation)
        asyncQuizProcessor.process(job.getId(), lessonInfo.id(), lessonInfo.title(),
                lessonInfo.articleContent(), request.getQuestionCount());

        // 6. Return 202
        return aiJobService.getJobStatus(job.getId());
        // NOTE: Multiple generations per lesson are intentional — teachers can regenerate.
        // Duplicate guard not added per design decision; all versions are stored.
    }

    @Override
    public List<GeneratedQuizResponse> getQuizzesByLesson(Long lessonId, Long userId) {
        LessonInfo lessonInfo = lessonQueryService.getLessonInfo(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lessonId));

        if (!lessonInfo.instructorId().equals(userId)) {
            throw new UnauthorizedException("You do not own this lesson's course");
        }

        return generatedQuizRepository.findByLessonIdOrderByCreatedAtDesc(lessonId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private GeneratedQuizResponse toResponse(GeneratedQuiz quiz) {
        List<QuizQuestionDto> questions = deserialize(quiz.getQuestionsJson());
        return GeneratedQuizResponse.builder()
                .id(quiz.getId())
                .lessonId(quiz.getLessonId())
                .jobId(quiz.getJobId())
                .questionCount(questions.size())
                .questions(questions)
                .createdAt(quiz.getCreatedAt())
                .build();
    }

    @Override
    public GeneratedQuizResponse getLatestQuizForStudent(Long lessonId, Long userId) {
        // 1. Load lesson via ACL
        LessonInfo lessonInfo = lessonQueryService.getLessonInfo(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lessonId));

        // 2. Verify enrollment
        if (!enrollmentQueryService.isEnrolledAndActive(lessonInfo.courseId(), userId)) {
            throw new UnauthorizedException("You must be enrolled in this course to take the quiz");
        }

        // 3. Get latest quiz
        List<GeneratedQuiz> quizzes = generatedQuizRepository.findByLessonIdOrderByCreatedAtDesc(lessonId);
        if (quizzes.isEmpty()) {
            return null;  // No quiz available yet
        }

        GeneratedQuiz latestQuiz = quizzes.get(0);
        return toStudentResponse(latestQuiz);
    }

    @Override
    @Transactional
    public QuizAttemptResponse submitAttempt(SubmitQuizAttemptRequest request, Long userId) {
        // 1. Load lesson via ACL
        LessonInfo lessonInfo = lessonQueryService.getLessonInfo(request.getLessonId())
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + request.getLessonId()));

        // 2. Verify enrollment
        if (!enrollmentQueryService.isEnrolledAndActive(lessonInfo.courseId(), userId)) {
            throw new UnauthorizedException("You must be enrolled in this course to take the quiz");
        }

        // 3. Load quiz
        GeneratedQuiz quiz = generatedQuizRepository.findById(request.getQuizId())
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found: " + request.getQuizId()));

        if (!quiz.getLessonId().equals(request.getLessonId())) {
            throw new BadRequestException("Quiz does not belong to this lesson");
        }

        // 4. Deserialize questions
        List<QuizQuestionDto> questions = deserialize(quiz.getQuestionsJson());

        // 5. Validate answers length
        if (request.getAnswers().size() != questions.size()) {
            throw new BadRequestException("Number of answers must match number of questions");
        }

        // 6. Score the attempt
        int score = 0;
        for (int i = 0; i < questions.size(); i++) {
            if (request.getAnswers().get(i) != null && 
                request.getAnswers().get(i).equals(questions.get(i).correctIndex())) {
                score++;
            }
        }

        // 7. Save attempt
        String answersJson;
        try {
            answersJson = objectMapper.writeValueAsString(request.getAnswers());
        } catch (Exception e) {
            log.error("Failed to serialize answers JSON", e);
            throw new RuntimeException("Failed to serialize answers", e);
        }

        QuizAttempt attempt = QuizAttempt.builder()
                .studentId(userId)
                .lessonId(request.getLessonId())
                .quiz(quiz)
                .score(score)
                .total(questions.size())
                .answersJson(answersJson)
                .build();

        attempt = quizAttemptRepository.save(attempt);

        // 8. Calculate percentage
        int percentage = Math.round((float) score / questions.size() * 100);

        // 9. Return response with full questions (for review)
        return QuizAttemptResponse.builder()
                .id(attempt.getId())
                .lessonId(attempt.getLessonId())
                .quizId(quiz.getId())
                .score(score)
                .total(questions.size())
                .percentage(percentage)
                .answers(request.getAnswers())
                .completedAt(attempt.getCompletedAt())
                .quizQuestions(questions)  // Full questions with correctIndex and explanation
                .build();
    }

    @Override
    public List<QuizAttemptResponse> getMyAttempts(Long lessonId, Long userId) {
        // 1. Load lesson via ACL (basic validation)
        lessonQueryService.getLessonInfo(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found: " + lessonId));

        // 2. Get attempts
        List<QuizAttempt> attempts = quizAttemptRepository.findByStudentIdAndLessonIdOrderByCreatedAtDesc(userId, lessonId);

        // 3. Convert to responses
        return attempts.stream().map(attempt -> {
            GeneratedQuiz quiz = attempt.getQuiz();
            List<QuizQuestionDto> questions = deserialize(quiz.getQuestionsJson());
            
            List<Integer> answers;
            try {
                answers = objectMapper.readValue(attempt.getAnswersJson(), 
                    new TypeReference<List<Integer>>() {});
            } catch (Exception e) {
                log.error("Failed to deserialize answers JSON: {}", attempt.getAnswersJson(), e);
                answers = new ArrayList<>();
            }

            int percentage = Math.round((float) attempt.getScore() / attempt.getTotal() * 100);

            return QuizAttemptResponse.builder()
                    .id(attempt.getId())
                    .lessonId(attempt.getLessonId())
                    .quizId(quiz.getId())
                    .score(attempt.getScore())
                    .total(attempt.getTotal())
                    .percentage(percentage)
                    .answers(answers)
                    .completedAt(attempt.getCompletedAt())
                    .quizQuestions(questions)  // Full questions for review
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Convert quiz to response for students (without correctIndex and explanation).
     */
    private GeneratedQuizResponse toStudentResponse(GeneratedQuiz quiz) {
        List<QuizQuestionDto> fullQuestions = deserialize(quiz.getQuestionsJson());
        
        // Return questions with null correctIndex and explanation for students
        // The frontend will handle this - correctIndex defaults to 0 but should be ignored
        List<QuizQuestionDto> questionsForStudent = fullQuestions.stream()
                .map(q -> new QuizQuestionDto(q.question(), q.options(), 0, null))
                .collect(Collectors.toList());

        return GeneratedQuizResponse.builder()
                .id(quiz.getId())
                .lessonId(quiz.getLessonId())
                .jobId(quiz.getJobId())
                .questionCount(questionsForStudent.size())
                .questions(questionsForStudent)
                .createdAt(quiz.getCreatedAt())
                .build();
    }

    private List<QuizQuestionDto> deserialize(String json) {
        try {
            return objectMapper.readValue(json, QUIZ_TYPE_REF);
        } catch (Exception e) {
            log.error("Failed to deserialize quiz questions JSON: {}", json, e);
            throw new RuntimeException("Failed to deserialize quiz questions", e);
        }
    }
}
