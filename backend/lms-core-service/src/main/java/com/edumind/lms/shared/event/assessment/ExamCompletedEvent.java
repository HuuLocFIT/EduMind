package com.edumind.lms.shared.event.assessment;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class ExamCompletedEvent extends DomainEvent {
    private final Long examId;
    private final Long studentId;
    private final Double score;
    private final Boolean passed;

    public ExamCompletedEvent(Object source, Long examId, Long studentId, Double score, Boolean passed) {
        super(source);
        this.examId = examId;
        this.studentId = studentId;
        this.score = score;
        this.passed = passed;
    }
}
