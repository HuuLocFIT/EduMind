package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class TranscriptionSourceResolver {

    private final CloudinaryAudioExtractor cloudinaryExtractor;
    private final YouTubeTranscriptExtractor youtubeExtractor;

    public TranscriptionInput resolve(String url) throws IOException, InterruptedException {
        if (url == null || url.isBlank()) {
            throw new BadRequestException("Video URL is required");
        }
        if (cloudinaryExtractor.supports(url)) {
            return cloudinaryExtractor.extract(url);
        }
        if (youtubeExtractor.supports(url)) {
            return youtubeExtractor.extract(url);
        }
        throw new BadRequestException("Unsupported URL type. Supported: Cloudinary, YouTube");
    }
}

