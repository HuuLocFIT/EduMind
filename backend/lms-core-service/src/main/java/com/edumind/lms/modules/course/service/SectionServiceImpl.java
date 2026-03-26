package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Section;
import com.edumind.lms.modules.course.event.SectionCreatedEvent;
import com.edumind.lms.modules.course.event.SectionDeletedEvent;
import com.edumind.lms.modules.course.event.SectionUpdatedEvent;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.SectionRepository;
import com.edumind.lms.shared.exception.BadRequestException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import com.edumind.lms.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SectionServiceImpl implements SectionService {
    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public Section createSection(Long courseId, Section section, Long instructorId) {
        log.info("Creating section for course {} by instructor {}", courseId, instructorId);

        // Get course and verify ownership
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        if (!course.getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only create sections for your own courses");
        }

        // Set course and order index
        section.setCourse(course);

        // Get max order index and set next
        Integer maxOrder = sectionRepository.findMaxOrderIndexByCourseId(courseId);
        section.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);

        Section savedSection = sectionRepository.save(section);
        log.info("Section created successfully with ID: {}", savedSection.getId());

        // Publish event
        eventPublisher.publishEvent(new SectionCreatedEvent(this, savedSection));

        return savedSection;
    }

    @Override
    @Transactional
    public Section updateSection(Long sectionId, Section sectionUpdate, Long instructorId) {
        log.info("Updating section {} by instructor {}", sectionId, instructorId);

        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));

        // Verify ownership
        if (!section.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only update sections of your own courses");
        }

        // Update fields
        section.setTitle(sectionUpdate.getTitle());
        if (sectionUpdate.getDescription() != null) {
            section.setDescription(sectionUpdate.getDescription());
        }

        Section updatedSection = sectionRepository.save(section);
        log.info("Section updated successfully");

        // Publish event
        eventPublisher.publishEvent(new SectionUpdatedEvent(this, updatedSection));

        return updatedSection;
    }

    @Override
    @Transactional
    public void deleteSection(Long sectionId, Long instructorId) {
        log.info("Deleting section {} by instructor {}", sectionId, instructorId);

        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));

        // Verify ownership
        if (!section.getCourse().getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only delete sections of your own courses");
        }

        sectionRepository.delete(section);
        log.info("Section deleted successfully");

        // Publish event
        eventPublisher.publishEvent(new SectionDeletedEvent(this, section));
    }

    @Override
    @Transactional(readOnly = true)
    public Section getSectionById(Long sectionId) {
        return sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with ID: " + sectionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Section> getCourseSections(Long courseId) {
        log.info("Fetching sections for course {}", courseId);
        return sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
    }

    @Override
    @Transactional
    public void reorderSections(Long courseId, List<Long> sectionIds, Long instructorId) {
        log.info("Reordering sections for course {} by instructor {}", courseId, instructorId);

        // Verify course ownership
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with ID: " + courseId));

        if (!course.getInstructorId().equals(instructorId)) {
            throw new UnauthorizedException("You can only reorder sections of your own courses");
        }

        if (sectionIds == null || sectionIds.isEmpty()) {
            throw new BadRequestException("Section IDs are required for reordering");
        }

        // Ensure there are no duplicate IDs in the request
        Set<Long> uniqueIds = new LinkedHashSet<>(sectionIds);
        if (uniqueIds.size() != sectionIds.size()) {
            throw new BadRequestException("Duplicate section IDs detected in reorder request");
        }

        // Fetch sections for the course and validate the request covers all sections
        List<Section> courseSections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
        if (courseSections.size() != sectionIds.size()) {
            throw new BadRequestException("Section list must include all sections of the course");
        }

        Map<Long, Section> sectionMap = courseSections.stream()
                .collect(Collectors.toMap(Section::getId, section -> section));

        // Validate every provided section belongs to the course
        List<Section> sectionsToUpdate = sectionIds.stream()
                .map(sectionId -> {
                    Section section = sectionMap.get(sectionId);
                    if (section == null) {
                        throw new BadRequestException("Section ID " + sectionId + " does not belong to this course");
                    }
                    return section;
                })
                .collect(Collectors.toList());

        // First pass: assign temporary order indexes beyond the current range to avoid unique constraint collisions
        int tempBaseIndex = courseSections.stream()
                .mapToInt(Section::getOrderIndex)
                .max()
                .orElse(0) + 1;
        for (int i = 0; i < sectionsToUpdate.size(); i++) {
            sectionsToUpdate.get(i).setOrderIndex(tempBaseIndex + i);
        }
        sectionRepository.saveAll(sectionsToUpdate);
        sectionRepository.flush();

        // Second pass: assign the final order indexes
        for (int i = 0; i < sectionsToUpdate.size(); i++) {
            sectionsToUpdate.get(i).setOrderIndex(i);
        }
        sectionRepository.saveAll(sectionsToUpdate);

        log.info("Sections reordered successfully");
    }
}
