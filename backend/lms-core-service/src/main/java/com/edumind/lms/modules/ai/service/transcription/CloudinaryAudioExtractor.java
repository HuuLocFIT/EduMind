package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
public class CloudinaryAudioExtractor implements AudioExtractor {

    @Override
    public boolean supports(String url) {
        return url != null && url.contains("res.cloudinary.com");
    }

    @Override
    public TranscriptionInput extract(String url) throws IOException {
        if (!supports(url)) {
            throw new BadRequestException("Not a Cloudinary URL");
        }

        String audioUrl = toCloudinaryMp3Url(url);
        Path tempFile = Files.createTempFile("cld_", ".mp3");

        log.info("Downloading Cloudinary audio: {} -> {}", audioUrl, tempFile);
        downloadToTempFile(audioUrl, tempFile);

        return new TranscriptionInput.AudioFile(tempFile);
    }

    /**
     * Transform Cloudinary video URL to MP3 audio URL by inserting:
     * vc_none,ac_mp3,br_32k right after /upload/
     */
    static String toCloudinaryMp3Url(String originalUrl) {
        if (originalUrl == null || originalUrl.isBlank()) {
            throw new BadRequestException("Video URL is required");
        }

        String url = originalUrl;
        String query = "";
        int q = url.indexOf('?');
        if (q >= 0) {
            query = url.substring(q);
            url = url.substring(0, q);
        }

        int uploadIdx = url.indexOf("/upload/");
        if (uploadIdx < 0) {
            throw new BadRequestException("Invalid Cloudinary URL (missing /upload/)");
        }

        String before = url.substring(0, uploadIdx + "/upload/".length());
        String after = url.substring(uploadIdx + "/upload/".length());

        // If transformations already exist (e.g. /upload/w_1000/...),
        // we still prepend ours to ensure mp3 audio extraction.
        String transformed = before + "vc_none,ac_mp3,br_32k/" + after;

        // Ensure file extension is .mp3
        int lastSlash = transformed.lastIndexOf('/');
        String pathBeforeFile = transformed.substring(0, lastSlash + 1);
        String filename = transformed.substring(lastSlash + 1);

        int dot = filename.lastIndexOf('.');
        if (dot >= 0) {
            filename = filename.substring(0, dot) + ".mp3";
        } else {
            filename = filename + ".mp3";
        }

        return pathBeforeFile + filename + query;
    }

    private void downloadToTempFile(String url, Path tempFile) throws IOException {
        URL u = URI.create(url).toURL();
        try (InputStream in = u.openStream();
             OutputStream out = Files.newOutputStream(tempFile)) {
            in.transferTo(out);
        }
    }
}

