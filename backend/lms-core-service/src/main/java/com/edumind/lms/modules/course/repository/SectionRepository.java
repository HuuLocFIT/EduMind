package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectionRepository extends JpaRepository<Section, Long> {
    /**
     * Find sections by course, ordered
     */
    List<Section> findByCourseIdOrderByOrderIndexAsc(Long courseId);

    /**
     * Count sections in course
     */
    long countByCourseId(Long courseId);

    /**
     * Find section by course and order index
     */
    @Query("SELECT s FROM Section s WHERE s.course.id = :courseId AND s.orderIndex = :orderIndex")
    Section findByCourseIdAndOrderIndex(Long courseId, Integer orderIndex);

    /**
     * Get max order index for course
     */
    @Query("SELECT MAX(s.orderIndex) FROM Section s WHERE s.course.id = :courseId")
    Integer findMaxOrderIndexByCourseId(Long courseId);
}