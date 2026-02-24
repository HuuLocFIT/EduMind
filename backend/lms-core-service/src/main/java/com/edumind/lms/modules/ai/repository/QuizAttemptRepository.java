package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByStudentIdAndLessonIdOrderByCreatedAtDesc(Long studentId, Long lessonId);
    long countByStudentIdAndLessonId(Long studentId, Long lessonId);
}
