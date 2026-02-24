package com.edumind.lms.modules.ai.service;

import com.edumind.lms.config.PostgresTestContainerConfig;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.ai.repository.AiJobLogRepository;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@Import(PostgresTestContainerConfig.class)
@Transactional
@DisplayName("AiJobService Integration Tests")
class AiJobServiceTest {

    @MockBean
    private ChatModel chatModel;

    @Autowired
    private AiJobService aiJobService;

    @Autowired
    private AiJobLogRepository aiJobLogRepository;

    @Test
    @DisplayName("createJob creates PENDING job and getJobStatus returns it")
    void createAndGetJob() {
        AiJobLog job = aiJobService.createJob(AiJobType.QUIZ_GENERATION, 1L, 100L);

        assertNotNull(job.getId());
        assertEquals(AiJobType.QUIZ_GENERATION, job.getJobType());
        assertEquals(AiJobStatus.PENDING, job.getStatus());
        assertEquals(1L, job.getUserId());
        assertEquals(100L, job.getReferenceId());

        AiJobResponse response = aiJobService.getJobStatus(job.getId());
        assertEquals(job.getId(), response.getJobId());
        assertEquals(AiJobStatus.PENDING, response.getStatus());
    }

    @Test
    @DisplayName("getJobStatus throws when job not found")
    void getJobStatus_notFound() {
        assertThrows(ResourceNotFoundException.class, () -> aiJobService.getJobStatus(99999L));
    }

    @Test
    @DisplayName("updateStatus updates job correctly through PROCESSING to COMPLETED")
    void updateStatus() {
        AiJobLog job = aiJobService.createJob(AiJobType.LESSON_SUMMARY, 2L, 50L);
        Long jobId = job.getId();

        aiJobService.updateStatus(jobId, AiJobStatus.PROCESSING, null);
        AiJobResponse r1 = aiJobService.getJobStatus(jobId);
        assertEquals(AiJobStatus.PROCESSING, r1.getStatus());
        assertNotNull(r1.getStartedAt());

        aiJobService.updateStatus(jobId, AiJobStatus.COMPLETED, null);
        AiJobResponse r2 = aiJobService.getJobStatus(jobId);
        assertEquals(AiJobStatus.COMPLETED, r2.getStatus());
        assertNotNull(r2.getCompletedAt());
    }

    @Test
    @DisplayName("updateStatus to FAILED persists errorMessage")
    void updateStatus_toFailedWithErrorMessage() {
        AiJobLog job = aiJobService.createJob(AiJobType.QUIZ_GENERATION, 3L, 77L);
        Long jobId = job.getId();

        String errorMsg = "Gemini API quota exceeded";
        aiJobService.updateStatus(jobId, AiJobStatus.FAILED, errorMsg);

        AiJobResponse response = aiJobService.getJobStatus(jobId);
        assertEquals(AiJobStatus.FAILED, response.getStatus());
        assertEquals(errorMsg, response.getErrorMessage());
        assertNotNull(response.getCompletedAt(), "completedAt should be set on FAILED");
    }

    @Test
    @DisplayName("getJob returns AiJobLog entity with correct fields")
    void getJob_returnsEntity() {
        AiJobLog created = aiJobService.createJob(AiJobType.LESSON_SUMMARY, 4L, 88L);

        AiJobLog fetched = aiJobService.getJob(created.getId());

        assertNotNull(fetched);
        assertEquals(created.getId(), fetched.getId());
        assertEquals(AiJobType.LESSON_SUMMARY, fetched.getJobType());
        assertEquals(AiJobStatus.PENDING, fetched.getStatus());
        assertEquals(4L, fetched.getUserId());
        // @PrePersist should have set timestamps — not the builder
        assertNotNull(fetched.getCreatedAt(), "@PrePersist should have set createdAt");
        assertNotNull(fetched.getUpdatedAt(), "@PrePersist should have set updatedAt");
    }

    @Test
    @DisplayName("getJob throws ResourceNotFoundException when job not found")
    void getJob_notFound() {
        assertThrows(ResourceNotFoundException.class, () -> aiJobService.getJob(99999L));
    }
}
