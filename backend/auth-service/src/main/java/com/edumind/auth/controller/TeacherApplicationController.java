package com.edumind.auth.controller;

import com.edumind.auth.dto.request.TeacherApplicationRequest;
import com.edumind.auth.dto.response.TeacherApplicationResponse;
import com.edumind.auth.dto.response.TrialStatusResponse;
import com.edumind.auth.service.TeacherApplicationService;
import com.edumind.common.response.*;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/teacher-application")
public class TeacherApplicationController {
    private static final Logger logger = LoggerFactory.getLogger(TeacherApplicationController.class);

    @Autowired
    private TeacherApplicationService applicationService;

    /**
     * Submit teacher application
     * POST /teacher-application/submit
     * Access: STUDENT (or GUEST if you allow)
     */
    @PostMapping("/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'GUEST')")
    public ResponseEntity<MessageResponse> submitApplication(
            @Valid @RequestBody TeacherApplicationRequest request) {

        logger.info("📥 POST /teacher-application/submit - Submitting teacher application");

        MessageResponse response = applicationService.submitApplication(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get my application status
     * GET /teacher-application/my-application
     * Access: Authenticated user
     */
    @GetMapping("/my-application")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TeacherApplicationResponse>> getMyApplication() {

        logger.info("📥 GET /teacher-application/my-application - Fetching user's application");

        TeacherApplicationResponse application = applicationService.getMyApplication();

        ApiResponse<TeacherApplicationResponse> response = ApiResponse.<TeacherApplicationResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Application retrieved successfully")
                .data(application)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Check if trial expired
     * GET /teacher-application/trial-status
     * Access: TEACHER_TRIAL
     */
    @GetMapping("/trial-status")
    @PreAuthorize("hasRole('TEACHER_TRIAL')")
    public ResponseEntity<ApiResponse<TrialStatusResponse>> getMyTrialStatus() {

        logger.info("📥 GET /teacher-application/trial-status - Checking trial status");

        // This would need implementation in service to get current user's trial info
        // For now, placeholder

        return ResponseEntity.ok(ApiResponse.<TrialStatusResponse>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Trial status retrieved")
                .build());
    }
}