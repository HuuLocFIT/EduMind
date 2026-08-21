package com.edumind.lms.modules.course.service;

import com.cloudinary.Cloudinary;
import com.edumind.common.service.CloudinaryService;
import com.edumind.lms.modules.course.dto.request.ConfirmVideoUploadRequest;
import com.edumind.lms.modules.course.dto.response.LessonResponse;
import com.edumind.lms.modules.course.dto.response.VideoSignatureResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Lesson;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.event.LessonContentUpdatedEvent;
import com.edumind.lms.modules.course.event.LessonCreatedEvent;
import com.edumind.lms.modules.course.event.LessonDeletedEvent;
import com.edumind.lms.modules.course.event.LessonUpdatedEvent;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.enums.VideoUploadStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.modules.course.repository.SectionRepository;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ConflictException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class LessonServiceImpl implements LessonService {
    private final LessonRepository lessonRepository;
    private final SectionRepository sectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Cloudinary cloudinary;
    private final CloudinaryService cloudinaryService;
    private final CourseService courseService;

    @Value("${video.hls.enabled:false}")
    private boolean hlsEnabled;


    @Override
    @Transactional
    public Lesson createLesson(Long sectionId, Lesson lesson, Long instructorId) {
        log.info("Creating lesson for section {} by instructor {}", sectionId, instructorId);

        // Get section and verify ownership
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));
        validateMutable(section.getCourse());

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

        // Recalculate duration hours
        courseService.recalculateDurationHours(course.getId());

        log.info("Lesson created successfully with ID: {}. Course {} totalLessons updated to {}",
                savedLesson.getId(), course.getId(), course.getTotalLessons());

        // Publish event
        eventPublisher.publishEvent(new LessonCreatedEvent(this, savedLesson));

        // Trigger AI processing when article content is provided at creation time
        if (savedLesson.getArticleContent() != null && !savedLesson.getArticleContent().isBlank()) {
            eventPublisher.publishEvent(new LessonContentUpdatedEvent(this, savedLesson));
            log.info("LessonContentUpdatedEvent published for newly created lesson {}", savedLesson.getId());
        }

        return savedLesson;
    }

    @Override
    @Transactional
    public Lesson updateLesson(Long lessonId, Lesson lessonUpdate, Long instructorId) {
        log.info("Updating lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

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
            courseService.recalculateDurationHours(lesson.getSection().getCourse().getId());
        }

        // Capture old article content before potential update
        String oldContent = lesson.getArticleContent();

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

        // Publish generic event
        eventPublisher.publishEvent(new LessonUpdatedEvent(this, updatedLesson));

        // Publish content-specific event only when articleContent changed
        if (lessonUpdate.getArticleContent() != null
                && !Objects.equals(oldContent, lessonUpdate.getArticleContent())) {
            eventPublisher.publishEvent(new LessonContentUpdatedEvent(this, updatedLesson));
            log.info("LessonContentUpdatedEvent published for lesson {}", updatedLesson.getId());
        }

        return updatedLesson;
    }

    @Override
    @Transactional
    public void deleteLesson(Long lessonId, Long instructorId) {
        log.info("Deleting lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete lessons of your own courses");
        }

        // Update course statistics: totalLessons
        Course course = lesson.getSection().getCourse();
        Integer currentTotalLessons = course.getTotalLessons() != null ? course.getTotalLessons() : 0;
        int newTotal = Math.max(0, currentTotalLessons - 1);
        course.setTotalLessons(newTotal);

        // Best-effort Cloudinary cleanup so deleting a lesson doesn't orphan its assets
        if (lesson.getVideoPublicId() != null) {
            try {
                cloudinaryService.deleteFile(lesson.getVideoPublicId(), "video");
                log.info("Deleted Cloudinary video: {}", lesson.getVideoPublicId());
            } catch (Exception e) {
                log.warn("Failed to delete Cloudinary video {}: {}", lesson.getVideoPublicId(), e.getMessage());
            }
        }
        if (lesson.getResources() != null) {
            for (var resource : lesson.getResources()) {
                try {
                    String publicId = cloudinaryService.extractPublicId(resource.getUrl());
                    cloudinaryService.deleteFile(publicId, "raw");
                    log.info("Deleted Cloudinary resource: {}", publicId);
                } catch (Exception e) {
                    log.warn("Failed to delete Cloudinary resource {}: {}", resource.getUrl(), e.getMessage());
                }
            }
        }

        lessonRepository.delete(lesson);

        // Recalculate duration hours
        courseService.recalculateDurationHours(course.getId());

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
        validateMutable(section.getCourse());

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
        int tempBaseIndex = sectionLessons.stream()
                .mapToInt(Lesson::getOrderIndex)
                .max()
                .orElse(0) + 1;
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

    @Override
    @Transactional
    public VideoSignatureResponse generateVideoUploadSignature(Long lessonId, Long instructorId) {
        log.info("Generating video upload signature for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only upload videos to your own lessons");
        }

        // Prevent duplicate concurrent upload for the same lesson
        if (lesson.getVideoUploadStatus() == VideoUploadStatus.UPLOADING) {
            throw new BadRequestException("This lesson already has an upload in progress");
        }

        // Rate limit: max 5 active uploads per instructor
        long activeUploads = lessonRepository.countByInstructorIdAndVideoUploadStatus(
                instructorId, VideoUploadStatus.UPLOADING);
        if (activeUploads >= 5) {
            throw new BadRequestException("Maximum 5 concurrent uploads allowed. Please wait for current uploads to finish.");
        }

        // Mark lesson as uploading
        lesson.setVideoUploadStatus(VideoUploadStatus.UPLOADING);
        lessonRepository.save(lesson);

        // Generate Cloudinary signed upload params
        long timestamp = Instant.now().getEpochSecond();
        String folder = "videos/lessons";

        Map<String, Object> paramsToSign = new java.util.HashMap<>();
        paramsToSign.put("timestamp", timestamp);
        paramsToSign.put("folder", folder);
        if (hlsEnabled) {
            paramsToSign.put("eager", "sp_auto/m3u8");
            paramsToSign.put("eager_async", true);
        }

        String apiSecret = (String) cloudinary.config.apiSecret;
        String signature = cloudinary.apiSignRequest(paramsToSign, apiSecret);

        return VideoSignatureResponse.builder()
                .cloudName((String) cloudinary.config.cloudName)
                .apiKey((String) cloudinary.config.apiKey)
                .signature(signature)
                .timestamp(timestamp)
                .folder(folder)
                .hlsEnabled(hlsEnabled)
                .build();
    }

    @Override
    @Transactional
    public LessonResponse confirmVideoUpload(Long lessonId, ConfirmVideoUploadRequest request, Long instructorId) {
        log.info("Confirming video upload for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only confirm uploads for your own lessons");
        }

        // Validate expected state
        if (lesson.getVideoUploadStatus() != VideoUploadStatus.UPLOADING) {
            throw new BadRequestException("No upload in progress for this lesson");
        }

        // Validate Cloudinary URL format — must belong to this account
        String expectedPrefix = "https://res.cloudinary.com/" + cloudinary.config.cloudName + "/";
        if (!request.getCloudinaryUrl().startsWith(expectedPrefix)) {
            throw new BadRequestException("Invalid Cloudinary URL");
        }

        // Delete old video if replacing
        String oldPublicId = lesson.getVideoPublicId();
        if (oldPublicId != null && !oldPublicId.equals(request.getPublicId())) {
            try {
                cloudinaryService.deleteFile(oldPublicId, "video");
                log.info("Deleted old Cloudinary video: {}", oldPublicId);
            } catch (Exception e) {
                log.warn("Failed to delete old Cloudinary video {}: {}", oldPublicId, e.getMessage());
            }
        }

        // Update lesson with video info
        lesson.setVideoUrl(request.getCloudinaryUrl());
        lesson.setVideoPublicId(request.getPublicId());
        lesson.setVideoDuration(request.getDuration());
        lesson.setHasHls(hlsEnabled);
        lesson.setVideoUploadStatus(VideoUploadStatus.READY);

        Lesson saved = lessonRepository.save(lesson);

        // Recalculate duration hours
        courseService.recalculateDurationHours(saved.getCourse().getId());

        log.info("Video upload confirmed for lesson {}", lessonId);

        String cloudName = (String) cloudinary.config.cloudName;
        String streamUrl = buildVideoQualityUrl(cloudName, saved.getVideoPublicId(), hlsEnabled, "720p");
        String url480p = buildVideoQualityUrl(cloudName, saved.getVideoPublicId(), false, "480p");

        return LessonResponse.builder()
                .id(saved.getId())
                .sectionId(saved.getSection().getId())
                .courseId(saved.getCourse().getId())
                .title(saved.getTitle())
                .description(saved.getDescription())
                .contentType(saved.getContentType())
                .videoUrl(saved.getVideoUrl())
                .videoStreamUrl(streamUrl)
                .video480pUrl(url480p)
                .videoDuration(saved.getVideoDuration())
                .videoUploadStatus(saved.getVideoUploadStatus())
                .videoPublicId(saved.getVideoPublicId())
                .articleContent(saved.getArticleContent())
                .resources(saved.getResources())
                .orderIndex(saved.getOrderIndex())
                .isPreview(saved.getIsPreview())
                .isMandatory(saved.getIsMandatory())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public void deleteVideo(Long lessonId, Long instructorId) {
        log.info("Deleting video for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

        // Verify ownership
        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete videos from your own lessons");
        }

        // Delete from Cloudinary
        if (lesson.getVideoPublicId() != null) {
            try {
                cloudinaryService.deleteFile(lesson.getVideoPublicId(), "video");
                log.info("Deleted Cloudinary video: {}", lesson.getVideoPublicId());
            } catch (Exception e) {
                log.warn("Failed to delete Cloudinary video {}: {}", lesson.getVideoPublicId(), e.getMessage());
            }
        }

        // Clear video fields
        lesson.setVideoUrl(null);
        lesson.setVideoPublicId(null);
        lesson.setVideoDuration(null);
        lesson.setHasHls(false);
        lesson.setVideoUploadStatus(VideoUploadStatus.NONE);

        lessonRepository.save(lesson);

        // Recalculate duration hours
        courseService.recalculateDurationHours(lesson.getSection().getCourse().getId());

        log.info("Video deleted for lesson {}", lessonId);
    }

    @Override
    @Transactional
    public void resetVideoUploadState(Long lessonId, Long instructorId) {
        log.info("Resetting video upload state for lesson {} by instructor {}", lessonId, instructorId);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        validateMutable(lesson.getSection().getCourse());

        if (!lesson.getSection().getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only reset uploads for your own lessons");
        }

        if (lesson.getVideoUploadStatus() == VideoUploadStatus.UPLOADING) {
            lesson.setVideoUploadStatus(VideoUploadStatus.FAILED);
            lessonRepository.save(lesson);
            log.info("Video upload state reset to FAILED for lesson {}", lessonId);
        }
    }

    @Override
    public void deleteResourceUpload(Long courseId, String url, Long instructorId) {
        log.info("Deleting resource upload for course {} by instructor {}", courseId, instructorId);

        Course course = courseService.getCourseById(courseId);
        validateMutable(course);

        if (!course.getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete resources from your own courses");
        }

        String publicId = cloudinaryService.extractPublicId(url);
        if (publicId == null || !publicId.startsWith("lessons/resources/")) {
            throw new BadRequestException("Invalid resource URL");
        }

        try {
            cloudinaryService.deleteFile(publicId, "raw");
            log.info("Deleted Cloudinary resource: {}", publicId);
        } catch (Exception e) {
            log.warn("Failed to delete Cloudinary resource {}: {}", publicId, e.getMessage());
        }
    }

    /**
     * Build a Cloudinary video delivery URL for a given quality.
     * When hlsEnabled=true and quality="720p", returns the HLS manifest URL.
     * Otherwise returns an on-demand MP4 transform URL (lazy, cached after first view).
     */
    private void validateMutable(Course course) {
        if (course.getStatus() == CourseStatus.ARCHIVED) {
            throw new ConflictException("Archived courses are read-only");
        }
    }

    private String buildVideoQualityUrl(String cloudName, String publicId, boolean useHls, String quality) {
        if (publicId == null) return null;
        if (useHls) {
            return "https://res.cloudinary.com/" + cloudName + "/video/upload/sp_auto/" + publicId + ".m3u8";
        }
        String transform = "720p".equals(quality)
                ? "q_auto,w_1280,h_720,c_limit"
                : "q_auto,w_854,h_480,c_limit";
        return "https://res.cloudinary.com/" + cloudName + "/video/upload/" + transform + "/" + publicId + ".mp4";
    }

}
