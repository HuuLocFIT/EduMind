import { apiClient } from "./api-client.service.js";
import type {
  FileUploadResponse,
} from "@edumind/shared-types";
import { UPLOAD_ENDPOINTS } from "@edumind/shared-utils";

class FileUploadService {
  /**
   * Upload a single file
   * POST /upload/document
   */
  static async uploadFile(file: File): Promise<FileUploadResponse> {
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
  }

  /**
   * Upload multiple files
   * @param files Array of File objects
   * @returns Array of FileUploadResponse
   */
  static async uploadMultipleFiles(
    files: File[]
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }
}

export default FileUploadService;

