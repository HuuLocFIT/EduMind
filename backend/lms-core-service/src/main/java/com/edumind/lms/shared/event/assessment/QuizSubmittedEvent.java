package com.edumind.lms.shared.event.assessment;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class QuizSubmittedEvent extends DomainEvent {
    private final Long quizId;
    private final Long studentId;
    private final Double score;
    private final Boolean passed;

    public QuizSubmittedEvent(Object source, Long quizId, Long studentId, Double score, Boolean passed) {
        super(source);
        this.quizId = quizId;
        this.studentId = studentId;
        this.score = score;
        this.passed = passed;
    }
}