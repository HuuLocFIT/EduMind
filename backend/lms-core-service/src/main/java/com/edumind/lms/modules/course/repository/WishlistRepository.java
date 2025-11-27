package com.edumind.lms.modules.course.repository;

import com.edumind.lms.modules.course.entity.Wishlist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    /**
     * Find wishlist item
     */
    Optional<Wishlist> findByStudentIdAndCourseId(Long studentId, Long courseId);

    /**
     * Check if course is in wishlist
     */
    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);

    /**
     * Find all wishlist items for student
     */
    Page<Wishlist> findByStudentId(Long studentId, Pageable pageable);

    /**
     * Delete wishlist item
     */
    void deleteByStudentIdAndCourseId(Long studentId, Long courseId);

    /**
     * Count wishlist items for student
     */
    long countByStudentId(Long studentId);

    /**
     * Find wishlist with course details
     */
    @Query("SELECT w FROM Wishlist w JOIN FETCH w.course WHERE w.studentId = :studentId")
    Page<Wishlist> findByStudentIdWithCourse(Long studentId, Pageable pageable);
}
