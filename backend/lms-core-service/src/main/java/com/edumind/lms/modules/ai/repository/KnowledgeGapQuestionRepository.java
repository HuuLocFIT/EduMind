package com.edumind.lms.modules.ai.repository;

import com.edumind.lms.modules.ai.entity.KnowledgeGapQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeGapQuestionRepository extends JpaRepository<KnowledgeGapQuestion, Long> {
}

