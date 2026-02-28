package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.GeneratedQuiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeneratedQuizRepository extends JpaRepository<GeneratedQuiz, Long> {
    List<GeneratedQuiz> findByLessonIdOrderByCreatedAtDesc(Long lessonId);
}
