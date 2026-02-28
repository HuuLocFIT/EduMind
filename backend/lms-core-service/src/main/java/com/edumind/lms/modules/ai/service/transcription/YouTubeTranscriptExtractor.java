package com.edumind.lms.modules.ai.service.transcription;

import com.edumind.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
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
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class YouTubeTranscriptExtractor implements AudioExtractor {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofMinutes(5);

    private static final Pattern TIMESTAMP = Pattern.compile(
            "^\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\s+-->\\s+\\d{2}:\\d{2}:\\d{2}\\.\\d{3}.*$"
    );

    @Value("${ai.ytdlp.path:yt-dlp}")
    private String ytDlpPath;

    private final YtDlpAudioDownloader audioDownloader;

    @Override
    public boolean supports(String url) {
        return url != null && (url.contains("youtube.com/watch") || url.contains("youtu.be/"));
    }

    @Override
    public TranscriptionInput extract(String url) throws IOException, InterruptedException {
        if (!supports(url)) {
            throw new BadRequestException("Not a YouTube URL");
        }

        Path tmpDir = Paths.get(System.getProperty("java.io.tmpdir"));
        String base = "ytdlp_sub_" + UUID.randomUUID();
        String outputTemplate = tmpDir.resolve(base + "_%(id)s").toString();

        // Try captions first (free, doesn't consume Groq quota)
        List<String> cmd = new ArrayList<>();
        cmd.add(ytDlpPath);
        cmd.add("--write-auto-sub");
        cmd.add("--sub-lang");
        cmd.add("en");
        cmd.add("--skip-download");
        cmd.add("--output");
        cmd.add(outputTemplate);
        cmd.add(url);

        run(cmd, DEFAULT_TIMEOUT);

        Path vtt = findGeneratedVtt(tmpDir, base);
        if (vtt != null) {
            log.info("Using YouTube auto-captions: {}", vtt);
            try {
                String transcript = parseVttToText(vtt);
                if (transcript != null && !transcript.isBlank()) {
                    return new TranscriptionInput.DirectText(transcript);
                }
            } finally {
                try {
                    Files.deleteIfExists(vtt);
                } catch (IOException e) {
                    log.warn("Failed to delete VTT temp file {}: {}", vtt, e.getMessage());
                }
            }
        }

        // Fallback to audio download
        log.info("No usable captions found. Falling back to yt-dlp audio download.");
        return audioDownloader.download(url);
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

    private Path findGeneratedVtt(Path tmpDir, String basePrefix) throws IOException {
        try (var stream = Files.list(tmpDir)) {
            return stream
                    .filter(p -> p.getFileName().toString().startsWith(basePrefix))
                    .filter(p -> p.getFileName().toString().endsWith(".en.vtt"))
                    .findFirst()
                    .orElse(null);
        }
    }

    static String parseVttToText(Path vttFile) throws IOException {
        List<String> lines = Files.readAllLines(vttFile, StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder();

        String last = null;
        for (String raw : lines) {
            String line = raw == null ? "" : raw.trim();
            if (line.isBlank()) {
                continue;
            }
            if (line.equalsIgnoreCase("WEBVTT")) {
                continue;
            }
            if (TIMESTAMP.matcher(line).matches()) {
                continue;
            }
            if (line.startsWith("NOTE")) {
                continue;
            }

            // Deduplicate consecutive identical lines
            if (last != null && last.equalsIgnoreCase(line)) {
                continue;
            }
            last = line;

            // Remove formatting tags commonly found in VTT
            line = line.replaceAll("<[^>]+>", "");

            if (!line.isBlank()) {
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(line);
            }
        }

        return sb.toString().trim();
    }
}

