package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class YtDlpAudioDownloader {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofMinutes(10);

    @Value("${ai.ytdlp.path:yt-dlp}")
    private String ytDlpPath;

    public TranscriptionInput.AudioFile download(String youtubeUrl) throws IOException, InterruptedException {
        if (youtubeUrl == null || youtubeUrl.isBlank()) {
            throw new BadRequestException("Video URL is required");
        }

        Path tmpDir = Paths.get(System.getProperty("java.io.tmpdir"));
        String base = "ytdlp_audio_" + UUID.randomUUID();
        Path outputTemplate = tmpDir.resolve(base + ".%(ext)s");

        List<String> cmd = new ArrayList<>();
        cmd.add(ytDlpPath);
        cmd.add("-x");
        cmd.add("--audio-format");
        cmd.add("mp3");
        cmd.add("--audio-quality");
        cmd.add("32K");
        cmd.add("--output");
        cmd.add(outputTemplate.toString());
        cmd.add(youtubeUrl);

        run(cmd, DEFAULT_TIMEOUT);

        Path mp3 = tmpDir.resolve(base + ".mp3");
        if (!Files.exists(mp3)) {
            throw new IOException("yt-dlp did not produce expected mp3 file: " + mp3);
        }

        return new TranscriptionInput.AudioFile(mp3);
    }

    private void run(List<String> cmd, Duration timeout) throws IOException, InterruptedException {
        log.info("Running command: {}", String.join(" ", cmd));
        Process process;
        try {
            process = new ProcessBuilder(cmd)
                    .redirectErrorStream(true)
                    .start();
        } catch (IOException e) {
            if (e.getMessage() != null && e.getMessage().contains("No such file or directory")) {
                throw new IOException(
                        "yt-dlp binary not found at path: '" + ytDlpPath + "'. " +
                        "Install it (brew install yt-dlp) or set the YTDLP_PATH environment variable.", e);
            }
            throw e;
        }

        StringBuilder outputCapture = new StringBuilder();
        Thread drainer = Thread.ofVirtual().start(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputCapture.append(line).append('\n');
                }
            } catch (IOException ignored) {
            }
        });

        boolean finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
        drainer.join(2_000);

        if (!finished) {
            process.destroyForcibly();
            throw new IOException("Command timed out: " + String.join(" ", cmd));
        }

        if (process.exitValue() != 0) {
            throw new IOException("Command failed (" + process.exitValue() + "): " + outputCapture);
        }
    }
}

