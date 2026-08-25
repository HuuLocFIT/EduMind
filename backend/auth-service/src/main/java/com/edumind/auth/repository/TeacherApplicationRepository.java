package com.edumind.auth.repository;

import com.edumind.auth.entity.TeacherApplication;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherApplicationRepository extends JpaRepository<TeacherApplication, Long> {
    String LATEST_APPLICATION = "a.id = (SELECT MAX(a2.id) FROM TeacherApplication a2 WHERE a2.user = a.user)";

    Optional<TeacherApplication> findTopByUserOrderByIdDesc(User user);

    /**
     * Find applications by status with eager fetching of user and reviewedBy.
     * NOTE: Do NOT include OneToMany (statusHistory) in @EntityGraph with Pageable
     * as it causes incorrect pagination results. Use @BatchSize on entity instead.
     */
    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Query("SELECT a FROM TeacherApplication a WHERE a.status = :status AND " + LATEST_APPLICATION)
    Page<TeacherApplication> findByStatus(@Param("status") ApplicationStatus status, Pageable pageable);

    /**
     * Find all applications with eager fetching of user and reviewedBy.
     * NOTE: Do NOT include OneToMany (statusHistory) in @EntityGraph with Pageable
     * as it causes incorrect pagination results. Use @BatchSize on entity instead.
     */
    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Query("SELECT a FROM TeacherApplication a WHERE " + LATEST_APPLICATION)
    Page<TeacherApplication> findAll(Pageable pageable);

    /**
     * Find application by ID with eager fetching
     */
    @EntityGraph(attributePaths = {"statusHistory", "user", "reviewedBy"})
    @Override
    Optional<TeacherApplication> findById(Long id);

    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Query("SELECT a FROM TeacherApplication a WHERE a.status = :status AND " + LATEST_APPLICATION + " AND " +
           "(LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.user.username) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<TeacherApplication> findByStatusAndSearch(
            @Param("status") ApplicationStatus status,
            @Param("search") String search,
            Pageable pageable);

    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Query("SELECT a FROM TeacherApplication a WHERE " + LATEST_APPLICATION + " AND " +
           "(LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.user.username) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<TeacherApplication> findAllWithSearch(
            @Param("search") String search,
            Pageable pageable);

    @EntityGraph(attributePaths = {"user", "reviewedBy"})
    @Query("SELECT a FROM TeacherApplication a WHERE a.status = :status AND " + LATEST_APPLICATION +
            " ORDER BY a.createdAt DESC")
    List<TeacherApplication> findByStatusOrderByCreatedAtDesc(@Param("status") ApplicationStatus status);

    @Query("SELECT COUNT(a) FROM TeacherApplication a WHERE a.status = :status AND " + LATEST_APPLICATION)
    long countByStatus(@Param("status") ApplicationStatus status);
}
