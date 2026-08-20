package com.edumind.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.edumind.common.dto.FileUploadResponse;
import com.edumind.common.exception.FileUploadException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CloudinaryServiceTest {

    private static final byte[] PNG_MAGIC = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00
    };
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x00};
    private static final byte[] WEBP_BYTES = "RIFF0000WEBPVP8 ".getBytes(StandardCharsets.US_ASCII);

    private Cloudinary cloudinary;
    private Uploader uploader;
    private CloudinaryService cloudinaryService;

    @BeforeEach
    void setUp() throws IOException {
        cloudinary = mock(Cloudinary.class);
        uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), any())).thenAnswer(invocation -> defaultUploadResult());
        cloudinaryService = new CloudinaryService(cloudinary);
    }

    @Test
    void sniffDetectsRealSvgDespiteSpoofedPngContentType() throws IOException {
        String maliciousSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<script>alert(1)</script>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.png", "image/png", maliciousSvg.getBytes(StandardCharsets.UTF_8));

        cloudinaryService.uploadIcon(file, "icons");

        ArgumentCaptor<Object> uploadedBytesCaptor = ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(uploader).upload(uploadedBytesCaptor.capture(), any());
        byte[] uploaded = (byte[]) uploadedBytesCaptor.getValue();
        String uploadedContent = new String(uploaded, StandardCharsets.UTF_8);

        assertThat(uploadedContent).doesNotContain("script");
        assertThat(uploadedContent).doesNotContain("alert");
    }

    @Test
    void spoofedSvgContentTypeOnRealPngStillUploadsAsRaster() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.svg", "image/svg+xml", PNG_MAGIC);

        FileUploadResponse response = cloudinaryService.uploadIcon(file, "icons");

        assertThat(response).isNotNull();
        ArgumentCaptor<Object> uploadedBytesCaptor = ArgumentCaptor.forClass(Object.class);
        org.mockito.Mockito.verify(uploader).upload(uploadedBytesCaptor.capture(), any());
        assertThat((byte[]) uploadedBytesCaptor.getValue()).isEqualTo(PNG_MAGIC);
    }

    @Test
    void rejectsFileWithUnrecognizedContentRegardlessOfHeader() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.png", "image/png", "just some random bytes".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> cloudinaryService.uploadIcon(file, "icons"))
                .isInstanceOf(FileUploadException.class);
    }

    @Test
    void doctypeSvgViaUploadIconIsStillRejected() {
        String maliciousSvg = "<?xml version=\"1.0\"?>"
                + "<!DOCTYPE svg [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
                + "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>&xxe;</text></svg>";
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.svg", "image/svg+xml", maliciousSvg.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> cloudinaryService.uploadIcon(file, "icons"))
                .isInstanceOf(FileUploadException.class);
    }

    @Test
    void cleanSvgHappyPathStillUploads() {
        String cleanSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";
        MockMultipartFile file = new MockMultipartFile(
                "file", "icon.svg", "image/svg+xml", cleanSvg.getBytes(StandardCharsets.UTF_8));

        FileUploadResponse response = cloudinaryService.uploadIcon(file, "icons");

        assertThat(response.getResourceType()).isEqualTo("image");
        assertThat(response.getUrl()).isEqualTo("https://cloudinary.example/result.png");
    }

    @Test
    void cleanPngJpegWebpHappyPathsStillUpload() {
        MockMultipartFile png = new MockMultipartFile("file", "icon.png", "image/png", PNG_MAGIC);
        MockMultipartFile jpeg = new MockMultipartFile("file", "icon.jpg", "image/jpeg", JPEG_MAGIC);
        MockMultipartFile webp = new MockMultipartFile("file", "icon.webp", "image/webp", WEBP_BYTES);

        assertThat(cloudinaryService.uploadIcon(png, "icons")).isNotNull();
        assertThat(cloudinaryService.uploadIcon(jpeg, "icons")).isNotNull();
        assertThat(cloudinaryService.uploadIcon(webp, "icons")).isNotNull();
    }

    @Test
    void uploadDocumentRejectsUnrecognizedContentRegardlessOfDeclaredType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resource.pdf", "application/pdf",
                "not actually a pdf".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> cloudinaryService.uploadDocument(file, "lessons/resources"))
                .isInstanceOf(FileUploadException.class);
    }

    @Test
    void uploadDocumentAcceptsPdf() {
        byte[] pdf = "%PDF-1.4 rest of file".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "resource.pdf", "application/pdf", pdf);

        assertThat(cloudinaryService.uploadDocument(file, "lessons/resources")).isNotNull();
    }

    @Test
    void uploadDocumentAcceptsDocxPptxXlsxAndZip() throws IOException {
        MockMultipartFile docx = new MockMultipartFile(
                "file", "resource.docx", "application/octet-stream", zipWithEntry("word/document.xml"));
        MockMultipartFile pptx = new MockMultipartFile(
                "file", "resource.pptx", "application/octet-stream", zipWithEntry("ppt/presentation.xml"));
        MockMultipartFile xlsx = new MockMultipartFile(
                "file", "resource.xlsx", "application/octet-stream", zipWithEntry("xl/workbook.xml"));
        MockMultipartFile zip = new MockMultipartFile(
                "file", "resource.zip", "application/octet-stream", zipWithEntry("some/file.txt"));

        assertThat(cloudinaryService.uploadDocument(docx, "lessons/resources")).isNotNull();
        assertThat(cloudinaryService.uploadDocument(pptx, "lessons/resources")).isNotNull();
        assertThat(cloudinaryService.uploadDocument(xlsx, "lessons/resources")).isNotNull();
        assertThat(cloudinaryService.uploadDocument(zip, "lessons/resources")).isNotNull();
    }

    @Test
    void uploadDocumentDoesNotDoublePrefixTheFolder() {
        byte[] pdf = "%PDF-1.4 rest of file".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile file = new MockMultipartFile("file", "resource.pdf", "application/pdf", pdf);

        cloudinaryService.uploadDocument(file, "lessons/resources");

        ArgumentCaptor<Map> optionsCaptor = ArgumentCaptor.forClass(Map.class);
        try {
            org.mockito.Mockito.verify(uploader).upload(any(), optionsCaptor.capture());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        Map<Object, Object> options = optionsCaptor.getValue();
        assertThat(options).containsEntry("folder", "lessons/resources");
        assertThat(options.get("public_id")).asString().doesNotContain("/");
    }

    private static byte[] zipWithEntry(String entryName) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            zos.putNextEntry(new ZipEntry(entryName));
            zos.write("content".getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return out.toByteArray();
    }

    private static Map<String, Object> defaultUploadResult() {
        Map<String, Object> result = new HashMap<>();
        result.put("public_id", "icons/generated-id");
        result.put("secure_url", "https://cloudinary.example/result.png");
        result.put("format", "png");
        result.put("bytes", 1234);
        return result;
    }
}
