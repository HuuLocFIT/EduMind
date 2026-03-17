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

    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @org.springframework.data.jpa.repository.Query("SELECT a FROM TeacherApplication a WHERE a.status = :status AND " +
           "(LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.user.username) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<TeacherApplication> findByStatusAndSearch(
            @org.springframework.data.repository.query.Param("status") ApplicationStatus status,
            @org.springframework.data.repository.query.Param("search") String search,
            Pageable pageable);

    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @org.springframework.data.jpa.repository.Query("SELECT a FROM TeacherApplication a WHERE " +
           "(LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.user.username) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<TeacherApplication> findAllWithSearch(
            @org.springframework.data.repository.query.Param("search") String search,
            Pageable pageable);

    List<TeacherApplication> findByStatusOrderByCreatedAtDesc(ApplicationStatus status);

    long countByStatus(ApplicationStatus status);

    Boolean existsByUser(User user);

    Boolean existsByUserId(Long userId);
}