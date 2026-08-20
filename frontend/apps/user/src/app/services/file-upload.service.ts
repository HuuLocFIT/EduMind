import { apiClient } from "./api-client.service.js";
import {
  type FileUploadResponse,
} from "@edumind/shared-types";
import { UPLOAD_ENDPOINTS } from "@edumind/shared-utils";

export const fileUploadService = {
  /**
   * Upload a single file
   * POST /upload/document
   */
  async uploadFile(
    file: File,
    folder = "lessons/resources"
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    params.set("folder", folder);

    const response = await apiClient.post<FileUploadResponse>(
      `${UPLOAD_ENDPOINTS.DOCUMENT}?${params.toString()}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  },

  /**
   * Upload multiple files
   * @param files Array of File objects
   * @returns Array of FileUploadResponse
   */
  async uploadMultipleFiles(
    files: File[],
    folder = "documents/teacher-applications"
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  },

  async uploadImage(
    file: File,
    folder?: string,
    maxWidth = 500,
    maxHeight = 500,
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    params.set("maxWidth", String(maxWidth));
    params.set("maxHeight", String(maxHeight));

    const response = await apiClient.post<FileUploadResponse>(
      `${UPLOAD_ENDPOINTS.IMAGE}?${params.toString()}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  },
}

export type FileUploadService = typeof fileUploadService;

