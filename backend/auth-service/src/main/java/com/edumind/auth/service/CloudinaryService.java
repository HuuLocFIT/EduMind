package com.edumind.auth.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.edumind.common.exception.FileUploadException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryService {
    private static final Logger logger = LoggerFactory.getLogger(CloudinaryService.class);
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    @Autowired
    private Cloudinary cloudinary;

    /**
     * Upload document to Cloudinary
     * Supported: PDF, DOC, DOCX, JPG, JPEG, PNG
     */
    public Map<String, Object> uploadDocument(MultipartFile file, String folder) {
        validateFile(file);

        try {
            // Generate unique public_id
            String publicId = folder + "/" + UUID.randomUUID().toString();

            logger.info("🔄 Uploading file to Cloudinary: {}", file.getOriginalFilename());

            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "folder", folder,
                            "resource_type", "auto", // Auto-detect file type
                            "allowed_formats", "pdf,doc,docx,jpg,jpeg,png"
                    )
            );

            logger.info("✅ File uploaded successfully: {}", uploadResult.get("secure_url"));

            return uploadResult;

        } catch (IOException e) {
            logger.error("❌ Failed to upload file to Cloudinary", e);
            throw new FileUploadException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Upload image (avatar, profile picture)
     */
    public Map<String, Object> uploadImage(MultipartFile file, String folder) {
        validateFile(file);
        validateImageFile(file);

        try {
            String publicId = folder + "/" + UUID.randomUUID().toString();

            logger.info("🔄 Uploading image to Cloudinary: {}", file.getOriginalFilename());

            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "folder", folder,
                            "resource_type", "image",
                            "transformation", ObjectUtils.asMap(
                                    "width", 500,
                                    "height", 500,
                                    "crop", "limit"
                            )
                    )
            );

            logger.info("✅ Image uploaded successfully: {}", uploadResult.get("secure_url"));

            return uploadResult;

        } catch (IOException e) {
            logger.error("❌ Failed to upload image to Cloudinary", e);
            throw new FileUploadException("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Delete file from Cloudinary
     */
    public void deleteFile(String publicId) {
        try {
            logger.info("🔄 Deleting file from Cloudinary: {}", publicId);

            Map<String, Object> deleteResult = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", "auto")
            );

            logger.info("✅ File deleted: {}", deleteResult);

        } catch (IOException e) {
            logger.error("❌ Failed to delete file from Cloudinary", e);
            throw new FileUploadException("Failed to delete file: " + e.getMessage());
        }
    }

    /**
     * Extract public_id from Cloudinary URL
     */
    public String extractPublicId(String url) {
        // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.jpg
        // Extract: folder/filename

        try {
            String[] parts = url.split("/upload/");
            if (parts.length < 2) {
                return null;
            }

            String afterUpload = parts[1];
            String[] segments = afterUpload.split("/");

            // Remove version and file extension
            StringBuilder publicId = new StringBuilder();
            for (int i = 1; i < segments.length; i++) {
                if (i > 1) publicId.append("/");
                String segment = segments[i];
                // Remove file extension
                int dotIndex = segment.lastIndexOf(".");
                if (dotIndex > 0) {
                    segment = segment.substring(0, dotIndex);
                }
                publicId.append(segment);
            }

            return publicId.toString();

        } catch (Exception e) {
            logger.error("❌ Failed to extract public_id from URL: {}", url);
            return null;
        }
    }

    /**
     * Validate file
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileUploadException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileUploadException("File size exceeds maximum limit of 10MB");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            throw new FileUploadException("Invalid filename");
        }
    }

    /**
     * Validate image file
     */
    private void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new FileUploadException("File must be an image");
        }

        String[] allowedTypes = {"image/jpeg", "image/jpg", "image/png"};
        boolean isAllowed = false;
        for (String type : allowedTypes) {
            if (type.equals(contentType)) {
                isAllowed = true;
                break;
            }
        }

        if (!isAllowed) {
            throw new FileUploadException("Only JPEG, JPG, and PNG images are allowed");
        }
    }
}