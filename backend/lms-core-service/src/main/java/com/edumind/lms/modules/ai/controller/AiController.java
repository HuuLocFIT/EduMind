package com.edumind.lms.modules.ai.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.service.AiJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiJobService aiJobService;

    /**
     * Get AI job status - used for polling after async job submission.
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<AiJobResponse>> getJobStatus(@PathVariable Long id) {
        AiJobResponse response = aiJobService.getJobStatus(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
