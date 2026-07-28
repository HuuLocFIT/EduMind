package com.edumind.lms.modules.course.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.dto.model.InstructorStatsProjection;
import com.edumind.lms.modules.course.dto.response.InstructorStatsResponse;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseLevel;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.exception.*;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.CourseSpecifications;
import org.springframework.data.jpa.domain.Specification;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.modules.course.event.CourseArchivedEvent;
import com.edumind.lms.modules.course.event.CourseCreatedEvent;
import com.edumind.lms.modules.course.event.CourseDeletedEvent;
import com.edumind.lms.modules.course.event.CoursePublishedEvent;
import com.edumind.lms.modules.course.event.CourseUpdatedEvent;
import com.edumind.lms.shared.client.UserClient;
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
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseServiceImpl implements CourseService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserClient userClient;

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
        course.setAverageRating(null); // Must be NULL when totalReviews = 0 (per check_rating_consistency constraint)
        course.setTotalReviews(0);
        course.setDurationHours(0); // No lessons yet

        // Validate price constraints
        validatePriceConstraints(course);

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
        validateCourseOwnership(courseId, instructorId);

        boolean isPublished = existingCourse.getStatus() == CourseStatus.PUBLISHED;

        if (isPublished) {
            validatePublishedCourseNoProtectedChanges(existingCourse, courseUpdate);
        }

        applyUpdatableFields(existingCourse, courseUpdate);

        if (!isPublished) {
            applyDraftOnlyFields(existingCourse, courseUpdate);
        }

        recalculateDurationHours(existingCourse);
        validatePriceConstraints(existingCourse);

        Course updatedCourse = courseRepository.save(existingCourse);

        eventPublisher.publishEvent(new CourseUpdatedEvent(this, courseId, instructorId));

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

        // Ensure durationHours is up-to-date before publishing
        recalculateDurationHours(course);

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

        eventPublisher.publishEvent(new CourseArchivedEvent(
                this,
                courseId,
                course.getTitle(),
                course.getInstructorId(),
                userId
        ));

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

        eventPublisher.publishEvent(new CourseDeletedEvent(
                this,
                courseId,
                course.getTitle(),
                course.getInstructorId(),
                true
        ));

        log.info("Course archived (soft-delete): {}", courseId);
    }

    @Override
    public Course getCourseById(Long courseId) {
        return courseRepository.findByIdWithStructure(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    @Override
    public Course getCourseBySlug(String slug) {
        return courseRepository.findBySlugWithStructure(slug)
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
            List<Long> categoryIds,
            List<CourseLevel> levels,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String keyword,
            Double minRating,
            Pageable pageable) {

        log.debug("Getting courses with filters - categories: {}, levels: {}, price: {}-{}, keyword: {}, minRating: {}",
                categoryIds, levels, minPrice, maxPrice, keyword, minRating);

        // Build specification by composing predicates
        Specification<Course> spec = CourseSpecifications.hasStatus(CourseStatus.PUBLISHED);

        // Add category filter
        if (categoryIds != null && !categoryIds.isEmpty()) {
            spec = spec.and(CourseSpecifications.inCategories(categoryIds));
        }

        // Add level filter
        if (levels != null && !levels.isEmpty()) {
            spec = spec.and(CourseSpecifications.inLevels(levels));
        }

        // Add price range filter
        if (minPrice != null || maxPrice != null) {
            spec = spec.and(CourseSpecifications.inPriceRange(minPrice, maxPrice));
        }

        // Add keyword filter
        if (keyword != null && !keyword.trim().isEmpty()) {
            spec = spec.and(CourseSpecifications.hasKeyword(keyword));
        }

        // Add rating filter
        if (minRating != null) {
            spec = spec.and(CourseSpecifications.minRating(minRating));
        }

        // Execute query with specifications
        return courseRepository.findAll(spec, pageable);
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

    @Override
    public InstructorStatsResponse getInstructorStats(Long instructorId) {
        // 1. Get profile from Auth Service
        UserPublicProfileResponse profile = fetchInstructorProfile(instructorId);

        // 2. Get stats from courses
        InstructorStatsProjection stats = courseRepository
                .getInstructorStats(instructorId)
                .orElse(null);

        // 3. Combine
        return InstructorStatsResponse.builder()
                .instructorId(instructorId)
                .instructorName(profile.getDisplayName())
                .bio(profile.getBio())
                .avatarUrl(profile.getAvatarUrl() != null
                        ? profile.getAvatarUrl()
                        : profile.getProfilePictureUrl())
                .totalCourses(stats != null ? stats.getTotalCourses().intValue() : 0)
                .totalStudents(stats != null ? stats.getTotalStudents() : 0L)
                .averageRating(stats != null
                        ? BigDecimal.valueOf(stats.getAverageRating())
                        : BigDecimal.ZERO)
                .totalReviews(stats != null ? stats.getTotalReviews() : 0L)
                .build();
    }

    private UserPublicProfileResponse fetchInstructorProfile(Long instructorId) {
        try {
            ApiResponse<UserPublicProfileResponse> response =
                    userClient.getUserPublicProfile(instructorId);
            
            if (response != null && response.getData() != null) {
                return response.getData();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch instructor profile for id {}", instructorId, e);
        }

        return UserPublicProfileResponse.builder()
                .id(instructorId)
                .displayName("Instructor #" + instructorId)
                .build();
    }

    private void applyUpdatableFields(Course existing, Course update) {
        if (update.getDescription() != null) existing.setDescription(update.getDescription());
        if (update.getShortDescription() != null) existing.setShortDescription(update.getShortDescription());
        if (update.getThumbnailUrl() != null) existing.setThumbnailUrl(update.getThumbnailUrl());
        if (update.getPreviewVideoUrl() != null) existing.setPreviewVideoUrl(update.getPreviewVideoUrl());
        if (update.getPrice() != null) {
            existing.setPrice(update.getPrice());
            if (existing.getDiscountPrice() != null
                    && existing.getDiscountPrice().compareTo(update.getPrice()) > 0) {
                existing.setDiscountPrice(null);
            }
        }
        if (update.getDiscountPrice() != null) existing.setDiscountPrice(update.getDiscountPrice());
        if (update.getMetaTitle() != null) existing.setMetaTitle(update.getMetaTitle());
        if (update.getMetaDescription() != null) existing.setMetaDescription(update.getMetaDescription());
        if (update.getMetaKeywords() != null) existing.setMetaKeywords(update.getMetaKeywords());

        applyBooleanUpgradeOnly(existing::setHasCertificate, existing.getHasCertificate(),
                update.getHasCertificate(), "hasCertificate");
        applyBooleanUpgradeOnly(existing::setHasSubtitles, existing.getHasSubtitles(),
                update.getHasSubtitles(), "hasSubtitles");
    }

    private void applyDraftOnlyFields(Course existing, Course update) {
        if (update.getTitle() != null) existing.setTitle(update.getTitle());
        if (update.getLevel() != null) existing.setLevel(update.getLevel());
        if (update.getLanguage() != null) existing.setLanguage(update.getLanguage());

        if (update.getSlug() != null && !existing.getSlug().equals(update.getSlug())) {
            if (courseRepository.existsBySlug(update.getSlug())) {
                throw new ConflictException("Course with slug '" + update.getSlug() + "' already exists");
            }
            existing.setSlug(update.getSlug());
        }
    }

    private void validatePublishedCourseNoProtectedChanges(Course existing, Course update) {
        rejectIfChanged(existing.getTitle(), update.getTitle(), "title");
        rejectIfChanged(existing.getSlug(), update.getSlug(), "slug");
        rejectIfChanged(existing.getLevel(), update.getLevel(), "level");
        rejectIfChanged(existing.getLanguage(), update.getLanguage(), "language");
    }

    private <T> void rejectIfChanged(T current, T updated, String fieldName) {
        if (updated != null && !Objects.equals(current, updated)) {
            throw new BadRequestException("Cannot update '" + fieldName + "' of a published course");
        }
    }

    private void applyBooleanUpgradeOnly(java.util.function.Consumer<Boolean> setter,
                                         Boolean current, Boolean update, String fieldName) {
        if (update == null) {
            return;
        }
        if (Boolean.TRUE.equals(current) && Boolean.FALSE.equals(update)) {
            throw new BadRequestException(fieldName + " cannot be disabled once enabled");
        }
        setter.accept(update);
    }

    @Override
    @Transactional
    public void recalculateDurationHours(Long courseId) {
        log.debug("Recalculating duration hours for course: {}", courseId);
        Course course = getCourseById(courseId);
        recalculateDurationHours(course);
        courseRepository.save(course);
    }

    private void recalculateDurationHours(Course course) {
        Integer totalVideoSeconds = lessonRepository.getTotalVideoDurationByCourse(course.getId());
        if (totalVideoSeconds != null && totalVideoSeconds > 0) {
            int hours = (int) Math.ceil(totalVideoSeconds / 3600.0);
            course.setDurationHours(hours);
        } else {
            course.setDurationHours(0);
        }
    }

    /**
     * Validates course price constraints
     * @param course Course to validate
     * @throws BadRequestException if price constraints are violated
     */
    private void validatePriceConstraints(Course course) {
        if (course.getPrice() != null && course.getPrice().doubleValue() < 0) {
            throw new BadRequestException("Course price cannot be negative");
        }
        if (course.getDiscountPrice() != null && course.getDiscountPrice().doubleValue() < 0) {
            throw new BadRequestException("Discount price cannot be negative");
        }
        if (course.getPrice() != null && course.getDiscountPrice() != null) {
            if (course.getDiscountPrice().compareTo(course.getPrice()) > 0) {
                throw new BadRequestException("Discount price cannot exceed the original price");
            }
        }
    }
}
