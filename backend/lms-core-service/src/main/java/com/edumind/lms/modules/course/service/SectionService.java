package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Section;

import java.util.List;

public interface SectionService {
    /**
     * Create section for course (TEACHER)
     */
    Section createSection(Long courseId, Section section, Long instructorId);

    /**
     * Update section (TEACHER)
     */
    Section updateSection(Long sectionId, Section sectionUpdate, Long instructorId);

    /**
     * Delete section (TEACHER)
     */
    void deleteSection(Long sectionId, Long instructorId);

    /**
     * Get section by ID
     */
    Section getSectionById(Long sectionId);

    /**
     * Get course sections (ordered)
     */
    List<Section> getCourseSections(Long courseId);

    /**
     * Reorder sections
     */
    void reorderSections(Long courseId, List<Long> sectionIds, Long instructorId);
}