package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.common.exception.BadRequestException;
import com.edumind.lms.modules.ai.dto.response.AiJobResponse;
import com.edumind.lms.modules.ai.entity.AiJobLog;
import com.edumind.lms.modules.ai.enums.AiJobStatus;
import com.edumind.lms.modules.ai.enums.AiJobType;
import com.edumind.lms.modules.ai.exception.AudioFileTooLargeException;
import com.edumind.lms.modules.ai.repository.AiJobLogRepository;
import com.edumind.lms.modules.course.api.LessonQueryService;
import com.edumind.lms.modules.course.api.LessonWriteService;
import com.edumind.lms.shared.exception.UnauthorizedException;
import com.edumind.lms.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhisperTranscriptionServiceImpl implements WhisperTranscriptionService {

    private static final long GROQ_MAX_BYTES = 25L * 1024 * 1024;

    private final TranscriptionSourceResolver resolver;
    private final AiJobLogRepository jobLogRepository;
    private final LessonQueryService lessonQueryService;
    private final LessonWriteService lessonWriteService;
    private final RestClient groqRestClient;

    @Value("${ai.groq.api-url:https://api.groq.com/openai/v1/audio/transcriptions}")
    private String groqApiUrl;

    @Value("${ai.groq.model:whisper-large-v3-turbo}")
    private String groqModel;

    @Value("${ai.groq.language:en}")
    private String groqLanguage;

    @Value("${ai.groq.retry-delay-seconds:60}")
    private int retryDelaySeconds;

    @Override
    public AiJobResponse requestTranscription(Long lessonId, String videoUrl, String language, Long userId) {
        if (lessonId == null) {
            throw new BadRequestException("lessonId is required");
        }
        if (videoUrl == null || videoUrl.isBlank()) {
            throw new BadRequestException("Video URL is required");
        }

        // Validate lesson exists + instructor owns it (avoid AI module depending on course internals)
        var lessonInfo = lessonQueryService.getLessonInfo(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found with ID: " + lessonId));
        if (!lessonInfo.instructorId().equals(userId)) {
            throw new UnauthorizedException("You can only transcribe lessons of your own courses");
        }

        // Store language and videoUrl together in metadata for retry support.
        // Format: "<language>|<videoUrl>" (e.g. "vi|https://res.cloudinary.com/...")
        String resolvedLanguage = (language != null && !language.isBlank()) ? language : "en";
        String metadata = resolvedLanguage + "|" + videoUrl;

        AiJobLog job = AiJobLog.builder()
                .jobType(AiJobType.TRANSCRIPTION)
                .status(AiJobStatus.PENDING)
                .userId(userId)
                .referenceId(lessonId)
                .metadata(metadata)
                .build();

        jobLogRepository.save(job);
        processTranscriptionAsync(job.getId(), lessonId, videoUrl, resolvedLanguage);
        return toResponse(job);
    }

    @Async("whisperTaskExecutor")
    @Override
    public void processTranscriptionAsync(Long jobId, Long lessonId, String videoUrl, String language) {
        AiJobLog job = jobLogRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("AI job not found: " + jobId));

        Path tempFile = null;
        try {
            job.setStatus(AiJobStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            job.setErrorMessage(null);
            jobLogRepository.save(job);

            TranscriptionInput input = resolver.resolve(videoUrl);

            String transcript;
            if (input instanceof TranscriptionInput.DirectText dt) {
                transcript = dt.text();
            } else if (input instanceof TranscriptionInput.AudioFile af) {
                tempFile = af.tempFile();
                long sizeBytes = Files.size(tempFile);
                if (sizeBytes > GROQ_MAX_BYTES) {
                    throw new AudioFileTooLargeException(sizeBytes);
                }
                transcript = sendToGroq(tempFile, language);
            } else {
                throw new IllegalStateException("Unknown TranscriptionInput type: " + input.getClass());
            }

            if (transcript == null || transcript.isBlank()) {
                throw new IllegalStateException(
                        "Transcription returned empty text. The audio may be silent or too short.");
            }

            lessonWriteService.updateArticleContent(lessonId, transcript);

            job.setStatus(AiJobStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());
            jobLogRepository.save(job);

        } catch (GroqRateLimitException e) {
            job.setStatus(AiJobStatus.DELAYED);
            job.setNextRetryAt(LocalDateTime.now().plusSeconds(retryDelaySeconds));
            job.setErrorMessage(e.getMessage());
            jobLogRepository.save(job);
            log.warn("Groq rate-limited job {}. Marked as DELAYED.", jobId);
        } catch (Exception e) {
            job.setStatus(AiJobStatus.FAILED);
            job.setCompletedAt(LocalDateTime.now());
            job.setErrorMessage(e.getMessage());
            jobLogRepository.save(job);
            log.error("Transcription job {} failed: {}", jobId, e.getMessage(), e);
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignore) {
                }
            }
        }
    }

    private String sendToGroq(Path audioFile, String language) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(audioFile));
        body.add("model", groqModel);
        // Use the per-request language; fall back to the configured default.
        String lang = (language != null && !language.isBlank()) ? language : groqLanguage;
        if (lang != null && !lang.isBlank()) {
            body.add("language", lang);
        }

        Map<String, Object> response = groqRestClient.post()
                .uri(groqApiUrl)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .onStatus(status -> status.value() == 429, (req, res) -> {
                    throw new GroqRateLimitException();
                })
                .body(new ParameterizedTypeReference<>() {
                });

        if (response == null || !response.containsKey("text")) {
            throw new IllegalStateException("Groq transcription response missing 'text'");
        }
        return String.valueOf(response.get("text"));
    }

    private AiJobResponse toResponse(AiJobLog job) {
        return AiJobResponse.builder()
                .jobId(job.getId())
                .jobType(job.getJobType())
                .status(job.getStatus())
                .userId(job.getUserId())
                .referenceId(job.getReferenceId())
                .errorMessage(job.getErrorMessage())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .nextRetryAt(job.getNextRetryAt())
                .createdAt(job.getCreatedAt())
                .build();
    }
}

