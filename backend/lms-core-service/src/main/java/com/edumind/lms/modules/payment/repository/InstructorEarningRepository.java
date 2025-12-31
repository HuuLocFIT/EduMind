package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InstructorEarningRepository extends JpaRepository<InstructorEarning, Long> {
    // By instructor
    Page<InstructorEarning> findByInstructorIdOrderByCreatedAtDesc(Long instructorId, Pageable pageable);

    Page<InstructorEarning> findByInstructorIdAndStatusOrderByCreatedAtDesc(
            Long instructorId, EarningStatus status, Pageable pageable);

    List<InstructorEarning> findByInstructorIdAndStatus(Long instructorId, EarningStatus status);

    // By course
    Page<InstructorEarning> findByCourseIdOrderByCreatedAtDesc(Long courseId, Pageable pageable);

    // By order
    List<InstructorEarning> findByOrderId(Long orderId);

    // Aggregations for instructor
    @Query("SELECT COALESCE(SUM(e.netAmount), 0) FROM InstructorEarning e " +
            "WHERE e.instructorId = :instructorId AND e.status = :status")
    BigDecimal sumNetAmountByInstructorIdAndStatus(
            @Param("instructorId") Long instructorId,
            @Param("status") EarningStatus status);

    @Query("SELECT COALESCE(SUM(e.netAmount), 0) FROM InstructorEarning e " +
            "WHERE e.instructorId = :instructorId")
    BigDecimal sumTotalNetAmountByInstructorId(@Param("instructorId") Long instructorId);

    @Query("SELECT COALESCE(SUM(e.grossAmount), 0) FROM InstructorEarning e " +
            "WHERE e.instructorId = :instructorId")
    BigDecimal sumTotalGrossAmountByInstructorId(@Param("instructorId") Long instructorId);

    // Earnings by date range
    @Query("SELECT e FROM InstructorEarning e WHERE e.instructorId = :instructorId " +
            "AND e.createdAt BETWEEN :startDate AND :endDate ORDER BY e.createdAt DESC")
    List<InstructorEarning> findByInstructorIdAndDateRange(
            @Param("instructorId") Long instructorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COALESCE(SUM(e.netAmount), 0) FROM InstructorEarning e " +
            "WHERE e.instructorId = :instructorId " +
            "AND e.createdAt BETWEEN :startDate AND :endDate " +
            "AND e.status != 'REFUNDED'")
    BigDecimal sumNetAmountByInstructorIdAndDateRange(
            @Param("instructorId") Long instructorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Count sales
    @Query("SELECT COUNT(e) FROM InstructorEarning e WHERE e.instructorId = :instructorId " +
            "AND e.status != 'REFUNDED'")
    long countSalesByInstructorId(@Param("instructorId") Long instructorId);

    @Query("SELECT COUNT(e) FROM InstructorEarning e WHERE e.courseId = :courseId " +
            "AND e.status != 'REFUNDED'")
    long countSalesByCourseId(@Param("courseId") Long courseId);

    // Platform earnings (for admin)
    @Query("SELECT COALESCE(SUM(e.platformFeeAmount), 0) FROM InstructorEarning e " +
            "WHERE e.createdAt BETWEEN :startDate AND :endDate AND e.status != 'REFUNDED'")
    BigDecimal sumPlatformFeeByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Top courses by earnings
    @Query("SELECT e.courseId, SUM(e.grossAmount) as total FROM InstructorEarning e " +
            "WHERE e.instructorId = :instructorId AND e.status != 'REFUNDED' " +
            "GROUP BY e.courseId ORDER BY total DESC")
    List<Object[]> findTopCoursesByEarnings(@Param("instructorId") Long instructorId, Pageable pageable);
}
