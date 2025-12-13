package com.edumind.auth.repository;

import com.edumind.auth.entity.TeacherApplication;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherApplicationRepository extends JpaRepository<TeacherApplication, Long> {
    Optional<TeacherApplication> findByUser(User user);

    Optional<TeacherApplication> findByUserId(Long userId);

    /**
     * Find applications by status with eager fetching of user and reviewedBy.
     * NOTE: Do NOT include OneToMany (statusHistory) in @EntityGraph with Pageable
     * as it causes incorrect pagination results. Use @BatchSize on entity instead.
     */
    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    Page<TeacherApplication> findByStatus(ApplicationStatus status, Pageable pageable);

    /**
     * Find all applications with eager fetching of user and reviewedBy.
     * NOTE: Do NOT include OneToMany (statusHistory) in @EntityGraph with Pageable
     * as it causes incorrect pagination results. Use @BatchSize on entity instead.
     */
    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Override
    Page<TeacherApplication> findAll(Pageable pageable);

    /**
     * Find application by ID with eager fetching
     */
    @EntityGraph(attributePaths = {"statusHistory", "user", "reviewedBy"})
    @Override
    Optional<TeacherApplication> findById(Long id);

    List<TeacherApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    Boolean existsByUser(User user);

    Boolean existsByUserId(Long userId);
}