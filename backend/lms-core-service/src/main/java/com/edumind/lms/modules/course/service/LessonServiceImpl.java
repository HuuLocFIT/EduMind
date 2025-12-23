package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.event.LessonCreatedEvent;
import com.edumind.lms.modules.course.event.LessonDeletedEvent;
import com.edumind.lms.modules.course.event.LessonUpdatedEvent;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.modules.course.repository.SectionRepository;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LessonServiceImpl implements LessonService {
    private final LessonRepository lessonRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Lesson createLesson(Long sectionId, Lesson lesson, Long instructorId) {
        log.info("Creating lesson for section {} by instructor {}", sectionId, instructorId);

        // Get section and verify ownership
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));

        if (!section.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only create lessons for your own courses");
        }

        // Set section, course and order index
        lesson.setSection(section);
        // Ensure non-null course_id in lessons table by inheriting from section
        lesson.setCourse(section.getCourse());

        // Get max order index and set next
        Integer maxOrder = lessonRepository.findMaxOrderIndexBySectionId(sectionId);
        lesson.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);

        Lesson savedLesson = lessonRepository.save(lesson);

        // Update course statistics: totalLessons
        Course course = section.getCourse();
        Integer currentTotalLessons = course.getTotalLessons() != null ? course.getTotalLessons() : 0;
        course.setTotalLessons(currentTotalLessons + 1);

        log.info("Lesson created successfully with ID: {}. Course {} totalLessons updated to {}",
                savedLesson.getId(), course.getId(), course.getTotalLessons());

        // Publish event
        eventPublisher.publishEvent(new LessonCreatedEvent(this, savedLesson));

        return savedLesson;
    }

    @Override
    @Transactional
    public Lesson updateLesson(Long lessonId, Lesson lessonUpdate, Long instructorId) {
        log.info("Updating lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only update lessons of your own courses");
        }

        // Validate title - cannot be null or empty
        if (lessonUpdate.getTitle() != null) {
            if (lessonUpdate.getTitle().isBlank()) {
                throw new BadRequestException("Lesson title cannot be empty");
            }
            lesson.setTitle(lessonUpdate.getTitle());
        }

        if (lessonUpdate.getDescription() != null) {
            lesson.setDescription(lessonUpdate.getDescription());
        }
        if (lessonUpdate.getContentType() != null) {
            lesson.setContentType(lessonUpdate.getContentType());
        }

        if (lessonUpdate.getVideoUrl() != null) {
            lesson.setVideoUrl(lessonUpdate.getVideoUrl());
        }

        // Validate videoDuration - must be >= 0
        if (lessonUpdate.getVideoDuration() != null) {
            if (lessonUpdate.getVideoDuration() < 0) {
                throw new BadRequestException("Video duration cannot be negative");
            }
            lesson.setVideoDuration(lessonUpdate.getVideoDuration());
        }

        if (lessonUpdate.getArticleContent() != null) {
            lesson.setArticleContent(lessonUpdate.getArticleContent());
        }

        if (lessonUpdate.getResources() != null) {
            lesson.setResources(lessonUpdate.getResources());
        }

        if (lessonUpdate.getIsPreview() != null) {
            lesson.setIsPreview(lessonUpdate.getIsPreview());
        }

        if (lessonUpdate.getIsMandatory() != null) {
            lesson.setIsMandatory(lessonUpdate.getIsMandatory());
        }

        Lesson updatedLesson = lessonRepository.save(lesson);
        log.info("Lesson updated successfully");

        // Publish event
        eventPublisher.publishEvent(new LessonUpdatedEvent(this, updatedLesson));

        return updatedLesson;
    }

    @Override
    @Transactional
    public void deleteLesson(Long lessonId, Long instructorId) {
        log.info("Deleting lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete lessons of your own courses");
        }

        // Update course statistics: totalLessons
        Course course = lesson.getSection().getCourse();
        Integer currentTotalLessons = course.getTotalLessons() != null ? course.getTotalLessons() : 0;
        int newTotal = Math.max(0, currentTotalLessons - 1);
        course.setTotalLessons(newTotal);

        lessonRepository.delete(lesson);
        log.info("Lesson deleted successfully. Course {} totalLessons updated to {}", course.getId(), newTotal);

        // Publish event
        eventPublisher.publishEvent(new LessonDeletedEvent(this, lesson));
    }

    @Override
    @Transactional(readOnly = true)
    public Lesson getLessonById(Long lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Lesson> getSectionLessons(Long sectionId) {
        log.info("Fetching lessons for section {}", sectionId);
        return lessonRepository.findBySectionIdOrderByOrderIndexAsc(sectionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Lesson> getCourseLessons(Long courseId) {
        log.info("Fetching lessons for course {}", courseId);
        return lessonRepository.findByCourseIdOrderBySectionAndLesson(courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Lesson> getPreviewLessons(Long courseId) {
        log.info("Fetching preview lessons for course {}", courseId);
        return lessonRepository.findByCourseIdAndIsPreviewTrue(courseId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canAccessLesson(Long lessonId, Long userId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));

        // If lesson is preview, anyone can access
        if (Boolean.TRUE.equals(lesson.getIsPreview())) {
            return true;
        }

        // Check if user is the instructor
        if (lesson.getSection().getCourse().getInstructorId().equals(userId)) {
            return true;
        }

        // Check if user is enrolled in the course with valid access status
        Long courseId = lesson.getSection().getCourse().getId();
        return enrollmentRepository.findByCourseIdAndStudentId(courseId, userId)
                .map(enrollment -> {
                    // Only ACTIVE, COMPLETED, or EXPIRED (within grace period) can access
                    // SUSPENDED: temporarily blocked - no access
                    // DROPPED: enrollment cancelled - no access (must re-enroll)
                    EnrollmentStatus status = enrollment.getStatus();
                    
                    if (status == EnrollmentStatus.ACTIVE || status == EnrollmentStatus.COMPLETED) {
                        return true;
                    }
                    
                    // EXPIRED: check if within grace period (7 days after expiration)
                    if (status == EnrollmentStatus.EXPIRED && enrollment.getExpiresAt() != null) {
                        java.time.LocalDateTime gracePeriodEnd = enrollment.getExpiresAt().plusDays(7);
                        return java.time.LocalDateTime.now().isBefore(gracePeriodEnd);
                    }
                    
                    return false;
                })
                .orElse(false);
    }

    @Override
    @Transactional
    public void reorderLessons(Long sectionId, List<Long> lessonIds, Long instructorId) {
        log.info("Reordering lessons for section {} by instructor {}", sectionId, instructorId);

        // Verify section ownership
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));

        if (!section.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only reorder lessons of your own courses");
        }

        if (lessonIds == null || lessonIds.isEmpty()) {
            throw new BadRequestException("Lesson IDs are required for reordering");
        }

        // Ensure there are no duplicate IDs in the request
        java.util.Set<Long> uniqueIds = new java.util.LinkedHashSet<>(lessonIds);
        if (uniqueIds.size() != lessonIds.size()) {
            throw new BadRequestException("Duplicate lesson IDs detected in reorder request");
        }

        // Fetch lessons for the section and validate the request covers all lessons
        List<Lesson> sectionLessons = lessonRepository.findBySectionIdOrderByOrderIndexAsc(sectionId);
        if (sectionLessons.size() != lessonIds.size()) {
            throw new BadRequestException("Lesson list must include all lessons of the section");
        }

        java.util.Map<Long, Lesson> lessonMap = sectionLessons.stream()
                .collect(java.util.stream.Collectors.toMap(Lesson::getId, lesson -> lesson));

        // Validate every provided lesson belongs to the section and build ordered list
        List<Lesson> lessonsToUpdate = lessonIds.stream()
                .map(lessonId -> {
                    Lesson lesson = lessonMap.get(lessonId);
                    if (lesson == null) {
                        throw new BadRequestException("Lesson ID " + lessonId + " does not belong to this section");
                    }
                    return lesson;
                })
                .collect(java.util.stream.Collectors.toList());

        // First pass: assign temporary order indexes beyond the current range
        int tempBaseIndex = sectionLessons.size();
        for (int i = 0; i < lessonsToUpdate.size(); i++) {
            lessonsToUpdate.get(i).setOrderIndex(tempBaseIndex + i);
        }
        lessonRepository.saveAll(lessonsToUpdate);
        lessonRepository.flush();

        // Second pass: assign the final order indexes
        for (int i = 0; i < lessonsToUpdate.size(); i++) {
            lessonsToUpdate.get(i).setOrderIndex(i);
        }
        lessonRepository.saveAll(lessonsToUpdate);

        log.info("Lessons reordered successfully");
    }
}
