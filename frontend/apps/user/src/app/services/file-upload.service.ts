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
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<FileUploadResponse>(
      UPLOAD_ENDPOINTS.DOCUMENT,
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
    files: File[]
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  },

  async uploadImage(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<FileUploadResponse>(
      UPLOAD_ENDPOINTS.IMAGE,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  },
}

export type FileUploadService = typeof fileUploadService;

