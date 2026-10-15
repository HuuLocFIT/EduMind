package com.edumind.lms.modules.course.event.listener;

import com.edumind.lms.modules.course.event.CategoryDeletedEvent;
import com.edumind.lms.modules.course.event.CategoryStatusChangedEvent;
import com.edumind.lms.modules.course.event.CategoryUpdatedEvent;
import com.edumind.lms.modules.course.event.CourseArchivedEvent;
import com.edumind.lms.modules.course.event.CoursePublishedEvent;
import com.edumind.lms.modules.course.event.CourseUpdatedEvent;
import com.edumind.lms.modules.course.event.EnrollmentDroppedEvent;
import com.edumind.lms.modules.course.event.LessonContentUpdatedEvent;
import com.edumind.lms.modules.course.event.LessonCreatedEvent;
import com.edumind.lms.modules.course.event.LessonDeletedEvent;
import com.edumind.lms.modules.course.event.LessonUpdatedEvent;
import com.edumind.lms.modules.course.event.ReviewApprovedEvent;
import com.edumind.lms.modules.course.event.ReviewCreatedEvent;
import com.edumind.lms.modules.course.event.ReviewDeletedEvent;
import com.edumind.lms.modules.course.event.ReviewRejectedEvent;
import com.edumind.lms.modules.course.event.ReviewUpdatedEvent;
import com.edumind.lms.modules.course.event.SectionCreatedEvent;
import com.edumind.lms.modules.course.event.SectionDeletedEvent;
import com.edumind.lms.modules.course.event.SectionUpdatedEvent;
import com.edumind.lms.modules.course.event.StudentEnrolledEvent;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.CourseReview;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.service.CourseDetailCacheEvictor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Keeps the course detail cache in sync with writes.
 *
 * <p>Runs AFTER_COMMIT so a concurrent reader cannot re-cache the pre-commit row, and
 * synchronously (no {@code @Async}) so the next request after a write already misses the cache.
 * Only ids are read from entity-carrying events; reading the id of a lazy proxy does not hit the DB.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseCacheEvictionListener {

    private final CourseDetailCacheEvictor evictor;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true, classes = {
            CourseUpdatedEvent.class, CoursePublishedEvent.class, CourseArchivedEvent.class,
            SectionCreatedEvent.class, SectionUpdatedEvent.class, SectionDeletedEvent.class,
            LessonCreatedEvent.class, LessonUpdatedEvent.class, LessonDeletedEvent.class,
            LessonContentUpdatedEvent.class,
            // Reviews change averageRating / totalReviews
            ReviewCreatedEvent.class, ReviewApprovedEvent.class, ReviewUpdatedEvent.class,
            ReviewDeletedEvent.class, ReviewRejectedEvent.class,
            // Enrollments change totalStudents
            StudentEnrolledEvent.class, EnrollmentDroppedEvent.class
    })
    public void onCourseChanged(ApplicationEvent event) {
        Long courseId = switch (event) {
            case CourseUpdatedEvent e -> e.getCourseId();
            case CoursePublishedEvent e -> e.getCourseId();
            case CourseArchivedEvent e -> e.getCourseId();
            case SectionCreatedEvent e -> courseIdOf(e.getSection());
            case SectionUpdatedEvent e -> courseIdOf(e.getSection());
            case SectionDeletedEvent e -> courseIdOf(e.getSection());
            case LessonCreatedEvent e -> courseIdOf(e.getLesson());
            case LessonUpdatedEvent e -> courseIdOf(e.getLesson());
            case LessonDeletedEvent e -> courseIdOf(e.getLesson());
            case LessonContentUpdatedEvent e -> courseIdOf(e.getLesson());
            case ReviewCreatedEvent e -> courseIdOf(e.getReview());
            case ReviewApprovedEvent e -> courseIdOf(e.getReview());
            case ReviewUpdatedEvent e -> e.getCourseId();
            case ReviewDeletedEvent e -> e.getCourseId();
            case ReviewRejectedEvent e -> e.getCourseId();
            case StudentEnrolledEvent e -> e.getCourseId();
            case EnrollmentDroppedEvent e -> e.getCourseId();
            default -> null;
        };

        if (courseId == null) {
            log.warn("Could not resolve course id from {}; clearing the whole course detail cache",
                    event.getClass().getSimpleName());
            evictor.evictAll();
            return;
        }
        evictor.evict(courseId);
    }

    /** Every cached course embeds its category, so category changes clear the whole cache. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true, classes = {
            CategoryUpdatedEvent.class, CategoryStatusChangedEvent.class, CategoryDeletedEvent.class
    })
    public void onCategoryChanged(ApplicationEvent event) {
        evictor.evictAll();
    }

    private static Long courseIdOf(Section section) {
        return section == null ? null : idOf(section.getCourse());
    }

    private static Long courseIdOf(Lesson lesson) {
        return lesson == null ? null : idOf(lesson.getCourse());
    }

    private static Long courseIdOf(CourseReview review) {
        return review == null ? null : idOf(review.getCourse());
    }

    private static Long idOf(Course course) {
        return course == null ? null : course.getId();
    }
}
