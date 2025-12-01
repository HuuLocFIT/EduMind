package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.exception.*;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.event.CourseCreatedEvent;
import com.edumind.lms.modules.course.event.CoursePublishedEvent;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ConflictException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseServiceImpl implements CourseService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Course createCourse(Course course, Long instructorId) {
        log.info("Creating course: {} by instructor: {}", course.getTitle(), instructorId);

        // Set instructor info
        course.setInstructorId(instructorId);

        // Ensure draft status for new courses
        course.setStatus(CourseStatus.DRAFT);

        // Validate slug uniqueness
        if (courseRepository.existsBySlug(course.getSlug())) {
            throw new ConflictException("Course with slug '" + course.getSlug() + "' already exists");
        }

        // Initialize statistics
        course.setTotalLessons(0);
        course.setTotalStudents(0);
        course.setAverageRating(BigDecimal.ZERO);
        course.setTotalReviews(0);

        Course savedCourse = courseRepository.save(course);

        // Publish event
        eventPublisher.publishEvent(new CourseCreatedEvent(
                this,
                savedCourse.getId(),
                savedCourse.getTitle(),
                instructorId
        ));

        log.info("Course created successfully: {}", savedCourse.getId());
        return savedCourse;
    }

    @Override
    @Transactional
    public Course updateCourse(Long courseId, Course courseUpdate, Long instructorId) {
        log.info("Updating course: {} by instructor: {}", courseId, instructorId);

        Course existingCourse = getCourseById(courseId);

        // Validate ownership
        validateCourseOwnership(courseId, instructorId);

        // Don't allow updating published courses to certain fields
        if (existingCourse.getStatus() == CourseStatus.PUBLISHED) {
            log.warn("Attempting to update published course: {}", courseId);
            // Only allow certain fields to be updated when published
            existingCourse.setDescription(courseUpdate.getDescription());
            existingCourse.setShortDescription(courseUpdate.getShortDescription());
            existingCourse.setThumbnailUrl(courseUpdate.getThumbnailUrl());
            existingCourse.setPreviewVideoUrl(courseUpdate.getPreviewVideoUrl());
        } else {
            // Full update for draft courses
            existingCourse.setTitle(courseUpdate.getTitle());
            existingCourse.setDescription(courseUpdate.getDescription());
            existingCourse.setShortDescription(courseUpdate.getShortDescription());
            existingCourse.setPrice(courseUpdate.getPrice());
            existingCourse.setDiscountPrice(courseUpdate.getDiscountPrice());
            existingCourse.setThumbnailUrl(courseUpdate.getThumbnailUrl());
            existingCourse.setPreviewVideoUrl(courseUpdate.getPreviewVideoUrl());
            existingCourse.setLevel(courseUpdate.getLevel());
            existingCourse.setLanguage(courseUpdate.getLanguage());
            existingCourse.setDurationHours(courseUpdate.getDurationHours());
            existingCourse.setHasCertificate(courseUpdate.getHasCertificate());
            existingCourse.setHasSubtitles(courseUpdate.getHasSubtitles());

            // Update slug only if changed and available
            if (!existingCourse.getSlug().equals(courseUpdate.getSlug())) {
                if (courseRepository.existsBySlug(courseUpdate.getSlug())) {
                    throw new ConflictException("Course with slug '" + courseUpdate.getSlug() + "' already exists");
                }
                existingCourse.setSlug(courseUpdate.getSlug());
            }
        }

        Course updatedCourse = courseRepository.save(existingCourse);
        log.info("Course updated successfully: {}", courseId);
        return updatedCourse;
    }

    @Override
    @Transactional
    public Course publishCourse(Long courseId, Long instructorId) {
        log.info("Publishing course: {} by instructor: {}", courseId, instructorId);

        Course course = getCourseById(courseId);

        // Validate ownership
        validateCourseOwnership(courseId, instructorId);

        // Check if already published
        if (course.getStatus() == CourseStatus.PUBLISHED) {
            throw new CourseAlreadyPublishedException(courseId);
        }

        // Validate course is ready to publish (has content)
        if (course.getTotalLessons() == 0) {
            throw new BadRequestException("Cannot publish course without lessons");
        }

        // Update status
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(LocalDateTime.now());

        Course publishedCourse = courseRepository.save(course);

        // Publish event
        eventPublisher.publishEvent(new CoursePublishedEvent(
                this,
                publishedCourse.getId(),
                publishedCourse.getTitle()
        ));

        log.info("Course published successfully: {}", courseId);
        return publishedCourse;
    }

    @Override
    @Transactional
    public Course archiveCourse(Long courseId, Long userId, String userRole) {
        log.info("Archiving course: {} by user: {} with role: {}", courseId, userId, userRole);

        Course course = getCourseById(courseId);

        // Validate authorization
        if (!"ADMIN".equals(userRole) && !course.getInstructorId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to archive this course");
        }

        course.setStatus(CourseStatus.ARCHIVED);
        Course archivedCourse = courseRepository.save(course);

        log.info("Course archived successfully: {}", courseId);
        return archivedCourse;
    }

    @Override
    @Transactional
    public void deleteCourse(Long courseId, Long userId, String userRole) {
        log.info("Deleting course: {} by user: {} with role: {}", courseId, userId, userRole);

        Course course = getCourseById(courseId);

        // Validate authorization
        if (!"ADMIN".equals(userRole) && !course.getInstructorId().equals(userId)) {
            throw new UnauthorizedException("Not authorized to delete this course");
        }

        // Don't allow deleting published courses with enrollments
        if (course.getStatus() == CourseStatus.PUBLISHED) {
            long enrollmentCount = enrollmentRepository.countByCourseId(courseId);
            if (enrollmentCount > 0) {
                throw new BadRequestException("Cannot delete course with active enrollments. Archive it instead.");
            }
        }

        course.setStatus(CourseStatus.ARCHIVED);
        courseRepository.save(course);
        log.info("Course deleted successfully: {}", courseId);
    }

    @Override
    public Course getCourseById(Long courseId) {
        return courseRepository.findByIdWithCategory(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    @Override
    public Course getCourseBySlug(String slug) {
        return courseRepository.findBySlug(slug)
                .orElseThrow(() -> new CourseNotFoundException(slug));
    }

    @Override
    public Page<Course> getCoursesByInstructor(Long instructorId, Pageable pageable) {
        log.debug("Getting courses for instructor: {}", instructorId);
        return courseRepository.findByInstructorId(instructorId, pageable);
    }

    @Override
    public Page<Course> getInstructorCoursesByStatus(Long instructorId, CourseStatus status, Pageable pageable) {
        log.debug("Getting courses for instructor: {} with status: {}", instructorId, status);
        return courseRepository.findByInstructorIdAndStatus(instructorId, status, pageable);
    }

    @Override
    public Page<Course> searchPublishedCourses(String keyword, Pageable pageable) {
        log.debug("Searching published courses with keyword: {}", keyword);
        return courseRepository.searchPublishedCourses(keyword, pageable);
    }

    @Override
    public Page<Course> getPublishedCoursesByCategory(Long categoryId, Pageable pageable) {
        log.debug("Getting published courses for category: {}", categoryId);
        return courseRepository.findPublishedCoursesByCategory(categoryId, pageable);
    }

    @Override
    public Page<Course> getCoursesWithFilters(
            Long categoryId,
            CourseLevel level,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String keyword,
            Pageable pageable) {

        log.debug("Getting courses with filters - category: {}, level: {}, price: {}-{}, keyword: {}",
                categoryId, level, minPrice, maxPrice, keyword);

        return courseRepository.findCoursesWithFilters(
                categoryId, level, minPrice, maxPrice, keyword, pageable);
    }

    @Override
    public Page<Course> getTopRatedCourses(Pageable pageable) {
        log.debug("Getting top-rated courses");
        return courseRepository.findTopRatedCourses(pageable);
    }

    @Override
    public Page<Course> getMostPopularCourses(Pageable pageable) {
        log.debug("Getting most popular courses");
        return courseRepository.findMostPopularCourses(pageable);
    }

    @Override
    public Page<Course> getNewestCourses(Pageable pageable) {
        log.debug("Getting newest courses");
        return courseRepository.findNewestCourses(pageable);
    }

    @Override
    public Page<Course> getFreeCourses(Pageable pageable) {
        log.debug("Getting free courses");
        return courseRepository.findFreeCourses(pageable);
    }

    @Override
    public boolean canAccessCourse(Long courseId, Long userId) {
        Course course = getCourseById(courseId);

        // Published courses are accessible to everyone
        if (course.getStatus() == CourseStatus.PUBLISHED) {
            return true;
        }

        // Instructors can access their own courses
        return course.getInstructorId().equals(userId);
    }

    @Override
    public void validateCourseOwnership(Long courseId, Long instructorId) {
        Course course = getCourseById(courseId);
        if (!course.getInstructorId().equals(instructorId)) {
            throw new UnauthorizedCourseAccessException(courseId, instructorId);
        }
    }

    @Override
    @Transactional
    public void updateCourseStatistics(Long courseId) {
        log.debug("Updating statistics for course: {}", courseId);

        Course course = getCourseById(courseId);

        // Update total students
        long totalStudents = enrollmentRepository.countByCourseId(courseId);
        course.setTotalStudents((int) totalStudents);

        courseRepository.save(course);
        log.debug("Course statistics updated: {}", courseId);
    }
}
