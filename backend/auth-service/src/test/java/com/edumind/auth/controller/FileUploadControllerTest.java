package com.edumind.auth.controller;

import com.edumind.auth.config.TestSecurityConfig;
import com.edumind.auth.dto.response.FileUploadResponse;
import com.edumind.auth.service.CloudinaryService;
import com.edumind.common.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for FileUploadController
 * Tests file upload and delete endpoints
 */
@WebMvcTest(FileUploadController.class)
@Import(TestSecurityConfig.class)
class FileUploadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CloudinaryService cloudinaryService;

    // ==================== UPLOAD DOCUMENT TESTS ====================

    @Nested
    @DisplayName("POST /upload/document Tests")
    class UploadDocumentTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should upload document successfully")
        void uploadDocument_WithValidFile_ShouldReturnSuccess() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "test-document.pdf",
                    "application/pdf",
                    "PDF content".getBytes()
            );

            FileUploadResponse response = FileUploadResponse.builder()
                    .publicId("teacher-documents/test-document")
                    .url("https://cloudinary.com/test-document.pdf")
                    .fileName("test-document.pdf")
                    .fileType("pdf")
                    .resourceType("raw")
                    .size(1024L)
                    .build();

            when(cloudinaryService.uploadDocument(any(), eq("teacher-documents")))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(multipart("/upload/document")
                            .file(file)
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Document uploaded successfully"))
                    .andExpect(jsonPath("$.data.url").value("https://cloudinary.com/test-document.pdf"));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should upload document with custom folder")
        void uploadDocument_WithCustomFolder_ShouldUseFolder() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "certificate.pdf",
                    "application/pdf",
                    "PDF content".getBytes()
            );

            FileUploadResponse response = FileUploadResponse.builder()
                    .publicId("certificates/certificate")
                    .url("https://cloudinary.com/certificates/certificate.pdf")
                    .fileName("certificate.pdf")
                    .fileType("pdf")
                    .resourceType("raw")
                    .size(2048L)
                    .build();

            when(cloudinaryService.uploadDocument(any(), eq("certificates")))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(multipart("/upload/document")
                            .file(file)
                            .param("folder", "certificates")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            verify(cloudinaryService).uploadDocument(any(), eq("certificates"));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for invalid file type")
        void uploadDocument_WithInvalidFileType_ShouldReturn400() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "malware.exe",
                    "application/octet-stream",
                    "Malicious content".getBytes()
            );

            when(cloudinaryService.uploadDocument(any(), anyString()))
                    .thenThrow(new BadRequestException("Invalid file type"));

            // When/Then
            mockMvc.perform(multipart("/upload/document")
                            .file(file)
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== UPLOAD IMAGE TESTS ====================

    @Nested
    @DisplayName("POST /upload/image Tests")
    class UploadImageTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should upload image successfully")
        void uploadImage_WithValidFile_ShouldReturnSuccess() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "avatar.png",
                    "image/png",
                    "PNG content".getBytes()
            );

            FileUploadResponse response = FileUploadResponse.builder()
                    .publicId("avatars/avatar")
                    .url("https://cloudinary.com/avatars/avatar.png")
                    .fileName("avatar.png")
                    .fileType("png")
                    .resourceType("image")
                    .size(512L)
                    .build();

            when(cloudinaryService.uploadImage(any(), eq("avatars")))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(multipart("/upload/image")
                            .file(file)
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Image uploaded successfully"))
                    .andExpect(jsonPath("$.data.url").value("https://cloudinary.com/avatars/avatar.png"));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should upload image with custom folder")
        void uploadImage_WithCustomFolder_ShouldUseFolder() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "profile.jpg",
                    "image/jpeg",
                    "JPEG content".getBytes()
            );

            FileUploadResponse response = FileUploadResponse.builder()
                    .publicId("profiles/profile")
                    .url("https://cloudinary.com/profiles/profile.jpg")
                    .fileName("profile.jpg")
                    .fileType("jpg")
                    .resourceType("image")
                    .size(1024L)
                    .build();

            when(cloudinaryService.uploadImage(any(), eq("profiles")))
                    .thenReturn(response);

            // When/Then
            mockMvc.perform(multipart("/upload/image")
                            .file(file)
                            .param("folder", "profiles")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            verify(cloudinaryService).uploadImage(any(), eq("profiles"));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for invalid image type")
        void uploadImage_WithInvalidImageType_ShouldReturn400() throws Exception {
            // Given
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    "document.pdf",
                    "application/pdf",
                    "PDF content".getBytes()
            );

            when(cloudinaryService.uploadImage(any(), anyString()))
                    .thenThrow(new BadRequestException("Invalid image type. Allowed: jpg, jpeg, png, gif, webp"));

            // When/Then
            mockMvc.perform(multipart("/upload/image")
                            .file(file)
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== DELETE FILE TESTS ====================

    @Nested
    @DisplayName("DELETE /upload Tests")
    class DeleteFileTests {

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should delete file successfully")
        void deleteFile_WithValidUrl_ShouldReturnSuccess() throws Exception {
            // Given
            String url = "https://res.cloudinary.com/demo/image/upload/avatars/test-avatar.png";

            when(cloudinaryService.extractPublicId(url)).thenReturn("avatars/test-avatar");
            when(cloudinaryService.extractResourceType(url)).thenReturn("image");
            doNothing().when(cloudinaryService).deleteFile("avatars/test-avatar", "image");

            // When/Then
            mockMvc.perform(delete("/upload")
                            .param("url", url)
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("File deleted successfully"));

            verify(cloudinaryService).deleteFile("avatars/test-avatar", "image");
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should return 400 for invalid URL")
        void deleteFile_WithInvalidUrl_ShouldReturn400() throws Exception {
            // Given
            String invalidUrl = "https://example.com/not-a-cloudinary-url.jpg";

            when(cloudinaryService.extractPublicId(invalidUrl)).thenReturn(null);

            // When/Then
            mockMvc.perform(delete("/upload")
                            .param("url", invalidUrl)
                            .with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Invalid Cloudinary URL or could not extract public_id"));
        }

        @Test
        @WithMockUser(username = "testuser")
        @DisplayName("Should delete raw file (document)")
        void deleteFile_ForDocument_ShouldUseRawResourceType() throws Exception {
            // Given
            String url = "https://res.cloudinary.com/demo/raw/upload/documents/test-doc.pdf";

            when(cloudinaryService.extractPublicId(url)).thenReturn("documents/test-doc");
            when(cloudinaryService.extractResourceType(url)).thenReturn("raw");
            doNothing().when(cloudinaryService).deleteFile("documents/test-doc", "raw");

            // When/Then
            mockMvc.perform(delete("/upload")
                            .param("url", url)
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            verify(cloudinaryService).deleteFile("documents/test-doc", "raw");
        }
    }
}
