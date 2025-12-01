package com.edumind.auth.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.edumind.auth.dto.response.FileUploadResponse;
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

    public FileUploadResponse uploadDocument(MultipartFile file, String folder) {
        validateFile(file);

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String publicId = folder + "/" + UUID.randomUUID().toString() + extension;

            logger.info("🔄 Uploading document to Cloudinary: {}", originalFilename);

            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "folder", folder,
                            "resource_type", "raw",
                            "use_filename", true,
                            "unique_filename", false
                    )
            );

            String secureUrl = (String) uploadResult.get("secure_url");
            logger.info("✅ Upload success: {}", secureUrl);

            return FileUploadResponse.builder()
                    .publicId((String) uploadResult.get("public_id"))
                    .url(secureUrl)
                    .fileName(originalFilename)
                    .fileType(extension.replace(".", ""))
                    .resourceType((String) uploadResult.get("resource_type"))
                    .size(((Number) uploadResult.get("bytes")).longValue())
                    .build();

        } catch (IOException e) {
            logger.error("❌ Failed to upload document to Cloudinary", e);
            throw new FileUploadException("Failed to upload document: " + e.getMessage());
        }
    }

    /**
     * Upload image (avatar, profile picture)
     */
    public FileUploadResponse uploadImage(MultipartFile file, String folder) {
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
                            "transformation", new Transformation<>()
                                    .width(500)
                                    .height(500)
                                    .crop("limit")
                    )
            );

            String secureUrl = (String) uploadResult.get("secure_url");
            logger.info("✅ Image uploaded successfully: {}", secureUrl);

            return FileUploadResponse.builder()
                    .publicId((String) uploadResult.get("public_id"))
                    .url(secureUrl)
                    .fileName(file.getOriginalFilename())
                    .fileType((String) uploadResult.get("format"))
                    .resourceType("image")
                    .size(((Number) uploadResult.get("bytes")).longValue())
                    .build();

        } catch (IOException e) {
            logger.error("❌ Failed to upload image to Cloudinary", e);
            throw new FileUploadException("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Delete file from Cloudinary
     * @param publicId: The ID of the file on Cloudinary
     * @param resourceType: "image", "video", or "raw"
     */
    public void deleteFile(String publicId, String resourceType) {
        // 1. Validate publicId
        if (publicId == null || publicId.trim().isEmpty()) {
            logger.warn("⚠️ Delete skipped: publicId is null or empty");
            return;
        }

        try {
            logger.info("🔄 Deleting file from Cloudinary. PublicId: {}, Type: {}", publicId, resourceType);

            String validResourceType = (resourceType == null || resourceType.trim().isEmpty()) ? "image" : resourceType;

            if (!"image".equals(validResourceType)
                    && !"video".equals(validResourceType)
                    && !"raw".equals(validResourceType)) {

                logger.warn("⚠️ Invalid resource_type '{}' detected. Defaulting to 'image'.", resourceType);
                validResourceType = "image";
            }

            Map<String, Object> deleteResult = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", validResourceType,
                            "invalidate", true
                    )
            );

            String result = (String) deleteResult.get("result");
            if ("ok".equals(result)) {
                logger.info("✅ File deleted successfully: {}", publicId);
            } else if ("not found".equals(result)) {
                logger.warn("⚠️ File not found on Cloudinary (already deleted?): {}", publicId);
            } else {
                logger.error("❌ Failed to delete file. Cloudinary response: {}", result);
                throw new FileUploadException("Cloudinary error: " + result);
            }

        } catch (IOException e) {
            logger.error("❌ Exception while deleting file from Cloudinary", e);
            throw new FileUploadException("Failed to delete file: " + e.getMessage());
        }
    }

    /**
     * Extract public_id from Cloudinary URL
     */
    public String extractPublicId(String url) {
        try {
            if (url == null || url.isEmpty()) return null;

            boolean isRaw = url.contains("/raw/upload/");

            String[] parts = url.split("/upload/");
            if (parts.length < 2) {
                return null;
            }

            String afterUpload = parts[1];
            String[] segments = afterUpload.split("/");

            int startIndex = 0;
            if (segments.length > 0 && segments[0].startsWith("v") && segments[0].matches("v\\d+")) {
                startIndex = 1;
            }

            StringBuilder publicIdBuilder = new StringBuilder();
            for (int i = startIndex; i < segments.length; i++) {
                if (i > startIndex) publicIdBuilder.append("/");
                publicIdBuilder.append(segments[i]);
            }

            String publicId = publicIdBuilder.toString();

            if (!isRaw) {
                int lastDotIndex = publicId.lastIndexOf(".");
                if (lastDotIndex > 0) {
                    publicId = publicId.substring(0, lastDotIndex);
                }
            }

            return publicId;

        } catch (Exception e) {
            logger.error("❌ Failed to extract public_id from URL: {}", url);
            return null;
        }
    }

    /**
     * Extract resource_type from Cloudinary URL
     */
    public String extractResourceType(String url) {
        try {
            String[] parts = url.split("/");
            for (int i = 0; i < parts.length; i++) {
                if ("upload".equals(parts[i]) && i > 0) {
                    return parts[i - 1];
                }
            }
            return "image"; // Default to image if not found
        } catch (Exception e) {
            logger.error("❌ Failed to extract resource_type from URL: {}", url);
            return "image"; // Default on error
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