package com.edumind.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.edumind.common.dto.FileUploadResponse;
import com.edumind.common.exception.FileUploadException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    private final Cloudinary cloudinary;

    /**
     * Upload document (PDF, DOC, etc.)
     */
    public FileUploadResponse uploadDocument(MultipartFile file, String folder) {
        validateFile(file);

        try {
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String publicId = folder + "/" + UUID.randomUUID().toString() + extension;

            log.info("🔄 Uploading document to Cloudinary: {}", originalFilename);

            @SuppressWarnings("unchecked")
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
            log.info("✅ Upload success: {}", secureUrl);

            return FileUploadResponse.builder()
                    .publicId((String) uploadResult.get("public_id"))
                    .url(secureUrl)
                    .fileName(originalFilename)
                    .fileType(extension.replace(".", ""))
                    .resourceType((String) uploadResult.get("resource_type"))
                    .size(((Number) uploadResult.get("bytes")).longValue())
                    .build();

        } catch (IOException e) {
            log.error("❌ Failed to upload document to Cloudinary", e);
            throw new FileUploadException("Failed to upload document: " + e.getMessage());
        }
    }

    /**
     * Upload PDF bytes directly (for generated PDFs)
     */
    public FileUploadResponse uploadPdf(byte[] pdfBytes, String folder, String filename) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new FileUploadException("PDF bytes cannot be empty");
        }

        try {
            // Ensure filename has .pdf extension for Cloudinary to recognize format
            String filenameWithExt = filename.endsWith(".pdf") ? filename : filename + ".pdf";
            // Only use filename in publicId, let Cloudinary add folder automatically
            // This prevents duplicate folder prefix (e.g., "edumind/invoices/edumind/invoices/...")
            String publicId = filenameWithExt;

            log.info("🔄 Uploading PDF to Cloudinary: {} in folder: {}", filenameWithExt, folder);

            // Validate PDF bytes (check PDF magic bytes: %PDF)
            if (pdfBytes.length < 4 || 
                pdfBytes[0] != 0x25 || // %
                pdfBytes[1] != 0x50 || // P
                pdfBytes[2] != 0x44 || // D
                pdfBytes[3] != 0x46) { // F
                log.warn("⚠️ Warning: PDF bytes may not be valid PDF format");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    pdfBytes,
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "folder", folder,
                            "resource_type", "auto",
                            "use_filename", false,
                            "unique_filename", false
                            // Note: Do not specify "format" for raw files - Cloudinary auto-detects from bytes
                            // Note: publicId should NOT include folder path when "folder" option is specified
                    )
            );

            String secureUrl = (String) uploadResult.get("secure_url");
            String detectedResourceType = (String) uploadResult.get("resource_type");
            String detectedFormat = (String) uploadResult.get("format");
            log.info("✅ PDF uploaded successfully: {} (Type: {}, Format: {})", secureUrl, detectedResourceType, detectedFormat);

            return FileUploadResponse.builder()
                    .publicId((String) uploadResult.get("public_id"))
                    .url(secureUrl)
                    .fileName(filenameWithExt)
                    .fileType("pdf")
                    .resourceType("raw")
                    .size(((Number) uploadResult.get("bytes")).longValue())
                    .build();

        } catch (IOException e) {
            log.error("❌ Failed to upload PDF to Cloudinary", e);
            throw new FileUploadException("Failed to upload PDF: " + e.getMessage());
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

            log.info("🔄 Uploading image to Cloudinary: {}", file.getOriginalFilename());

            @SuppressWarnings("unchecked")
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
            log.info("✅ Image uploaded successfully: {}", secureUrl);

            return FileUploadResponse.builder()
                    .publicId((String) uploadResult.get("public_id"))
                    .url(secureUrl)
                    .fileName(file.getOriginalFilename())
                    .fileType((String) uploadResult.get("format"))
                    .resourceType("image")
                    .size(((Number) uploadResult.get("bytes")).longValue())
                    .build();

        } catch (IOException e) {
            log.error("❌ Failed to upload image to Cloudinary", e);
            throw new FileUploadException("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Delete file from Cloudinary
     * @param publicId: The ID of the file on Cloudinary
     * @param resourceType: "image", "video", or "raw"
     */
    public void deleteFile(String publicId, String resourceType) {
        if (publicId == null || publicId.trim().isEmpty()) {
            log.warn("⚠️ Delete skipped: publicId is null or empty");
            return;
        }

        try {
            log.info("🔄 Deleting file from Cloudinary. PublicId: {}, Type: {}", publicId, resourceType);

            String validResourceType = (resourceType == null || resourceType.trim().isEmpty()) ? "image" : resourceType;

            if (!"image".equals(validResourceType)
                    && !"video".equals(validResourceType)
                    && !"raw".equals(validResourceType)) {
                log.warn("⚠️ Invalid resource_type '{}' detected. Defaulting to 'image'.", resourceType);
                validResourceType = "image";
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> deleteResult = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", validResourceType,
                            "invalidate", true
                    )
            );

            String result = (String) deleteResult.get("result");
            if ("ok".equals(result)) {
                log.info("✅ File deleted successfully: {}", publicId);
            } else if ("not found".equals(result)) {
                log.warn("⚠️ File not found on Cloudinary (already deleted?): {}", publicId);
            } else {
                log.error("❌ Failed to delete file. Cloudinary response: {}", result);
                throw new FileUploadException("Cloudinary error: " + result);
            }

        } catch (IOException e) {
            log.error("❌ Exception while deleting file from Cloudinary", e);
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
            log.error("❌ Failed to extract public_id from URL: {}", url);
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
            log.error("❌ Failed to extract resource_type from URL: {}", url);
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

