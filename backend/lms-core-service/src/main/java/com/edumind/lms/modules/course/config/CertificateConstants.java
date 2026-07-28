package com.edumind.lms.modules.course.config;

/**
 * Constants used throughout the Certificate module
 */
public final class CertificateConstants {
    private CertificateConstants() {
        // Prevent instantiation
    }

    // Cloudinary folders
    public static final String CLOUDINARY_CERTIFICATE_FOLDER = "documents/certificates";

    // Verification URL path
    public static final String VERIFICATION_BASE_PATH = "/api/certificates/verify/";
}
