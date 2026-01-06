package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.response.CourseEarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.MonthlyEarningResponse;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.service.EarningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/teacher/earnings")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacher()")
public class EarningController {

    private final EarningService earningService;

    // ==================== Earnings List ====================

    /**
     * Get instructor's earnings (paginated)
     * GET /teacher/earnings
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<EarningResponse>>> getMyEarnings(
            @RequestParam(required = false) EarningStatus status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching earnings, status: {}, courseId: {}", instructorId, status, courseId);

        Sort sort = sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<EarningResponse> earnings = earningService.getEarningsByInstructor(
                instructorId, status, courseId, fromDate, toDate, pageable);

        return ResponseEntity.ok(ApiResponse.success(earnings));
    }

    // ==================== Earnings Summary ====================

    /**
     * Get earnings summary/statistics
     * GET /teacher/earnings/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<EarningsSummaryResponse>> getEarningsSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching earnings summary", instructorId);

        EarningsSummaryResponse summary = earningService.getEarningsSummary(instructorId, fromDate, toDate);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    /**
     * Get monthly earnings summary
     * GET /teacher/earnings/monthly
     */
    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<List<MonthlyEarningResponse>>> getMonthlyEarnings(
            @RequestParam(defaultValue = "12") int months,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching monthly earnings for last {} months", instructorId, months);

        List<MonthlyEarningResponse> monthlyEarnings = earningService.getMonthlyEarnings(instructorId, months);

        return ResponseEntity.ok(ApiResponse.success(monthlyEarnings));
    }

    // ==================== Earnings by Course ====================

    /**
     * Get earnings grouped by course
     * GET /teacher/earnings/by-course
     */
    @GetMapping("/by-course")
    public ResponseEntity<ApiResponse<List<CourseEarningResponse>>> getEarningsByCourse(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching earnings by course", instructorId);

        List<CourseEarningResponse> courseEarnings = earningService.getEarningsByCourse(
                instructorId, fromDate, toDate);

        return ResponseEntity.ok(ApiResponse.success(courseEarnings));
    }

    // ==================== Export ====================

    /**
     * Export earnings to CSV
     * GET /teacher/earnings/export
     */
    @GetMapping("/export")
    public ResponseEntity<Resource> exportEarningsCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) EarningStatus status,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.info("Teacher {} exporting earnings to CSV", instructorId);

        byte[] csvContent = earningService.exportEarningsToCsv(instructorId, fromDate, toDate, status);

        ByteArrayResource resource = new ByteArrayResource(csvContent);

        String filename = String.format("earnings_%s_%s.csv", instructorId, LocalDate.now());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(csvContent.length)
                .body(resource);
    }

    // ==================== Earning Detail ====================

    /**
     * Get earning detail by ID
     * GET /teacher/earnings/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EarningResponse>> getEarningById(
            @PathVariable Long id,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.debug("Teacher {} fetching earning {}", instructorId, id);

        EarningResponse earning = earningService.getEarningByIdAndInstructor(id, instructorId);

        return ResponseEntity.ok(ApiResponse.success(earning));
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}