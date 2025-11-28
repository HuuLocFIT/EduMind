package com.edumind.auth.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FileUploadResponse {
    private String publicId;
    private String url;
    private String fileName;
    private String fileType;
    private String resourceType;  // raw or image
    private long size;
}