package com.edumind.auth.controller;

import com.edumind.auth.service.CloudinaryService;
import com.edumind.common.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/upload")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200"})
public class FileUploadController {
    private static final Logger logger = LoggerFactory.getLogger(FileUploadController.class);

    @Autowired
    private CloudinaryService cloudinaryService;

    /**
     * Upload document (for teacher applications)
     * POST /upload/document
     */
    @PostMapping("/document")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "teacher-documents") String folder) {

        logger.info("📥 POST /upload/document - Uploading file: {}", file.getOriginalFilename());

        Map<String, Object> uploadResult = cloudinaryService.uploadDocument(file, folder);

        ApiResponse<Map<String, Object>> response = ApiResponse.<Map<String, Object>>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Document uploaded successfully")
                .data(uploadResult)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Upload image (avatar, profile picture)
     * POST /upload/image
     */
    @PostMapping("/image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "avatars") String folder) {

        logger.info("📥 POST /upload/image - Uploading image: {}", file.getOriginalFilename());

        Map<String, Object> uploadResult = cloudinaryService.uploadImage(file, folder);

        ApiResponse<Map<String, Object>> response = ApiResponse.<Map<String, Object>>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("Image uploaded successfully")
                .data(uploadResult)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Delete file
     * DELETE /upload?url=....
     */
    @DeleteMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @RequestParam("url") String url) {

        logger.info("📥 DELETE /upload - Deleting file from URL: {}", url);

        String publicId = cloudinaryService.extractPublicId(url);
        String resourceType = cloudinaryService.extractResourceType(url);

        if (publicId == null) {
            return ResponseEntity.badRequest().body(
                    ApiResponse.<Void>builder()
                            .status(HttpStatus.BAD_REQUEST.value())
                            .success(false)
                            .message("Invalid Cloudinary URL or could not extract public_id")
                            .build()
            );
        }

        cloudinaryService.deleteFile(publicId, resourceType);

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message("File deleted successfully")
                .build();

        return ResponseEntity.ok(response);
    }
}