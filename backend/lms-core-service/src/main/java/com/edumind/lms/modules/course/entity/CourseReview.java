package com.edumind.lms.modules.course.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_reviews", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"course_id", "student_id"})
}, schema = "course")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseReview extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private Long studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(nullable = false)
    private Integer rating; // 1-5

    @Column(columnDefinition = "TEXT")
    private String reviewText;

    // Moderation
    @Column(nullable = false)
    private Boolean isApproved = false;

    @Column(nullable = false)
    private Boolean isFlagged = false;

    @Column(columnDefinition = "TEXT")
    private String instructorReply;

    @Column
    private LocalDateTime instructorReplyAt;

    // Validation
    @PrePersist
    @PreUpdate
    private void validateRating() {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
    }

    /**
     * Check if review has instructor reply
     */
    public boolean hasInstructorReply() {
        return instructorReply != null && !instructorReply.isBlank();
    }

    /**
     * Set instructor reply with timestamp
     */
    public void setInstructorReplyWithTimestamp(String reply) {
        this.instructorReply = reply;
        this.instructorReplyAt = LocalDateTime.now();
    }

    /**
     * Clear instructor reply
     */
    public void clearInstructorReply() {
        this.instructorReply = null;
        this.instructorReplyAt = null;
    }
}
