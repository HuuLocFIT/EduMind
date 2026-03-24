import { apiClient } from './api-client.service.js';
import { TEACHER_PORTAL_ENDPOINTS } from '@edumind/shared-utils';
import {
  VideoSignatureResponseSchema,
  LessonResponseSchema,
} from '@edumind/shared-types';
import type {
  VideoSignatureResponse,
  ConfirmVideoUploadRequest,
  LessonResponse,
} from '@edumind/shared-types';

const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB per chunk
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000; // 2 seconds

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration: number;
  bytes: number;
  format: string;
  resource_type: string;
}

interface UploadToCloudinaryParams {
  file: File;
  signature: VideoSignatureResponse;
  uploadId: string;
  onProgress: (percent: number, bytesUploaded: number) => void;
  signal: AbortSignal;
  startFromByte?: number;
}

/**
 * Get a signed upload credential from the backend
 */
async function getUploadSignature(lessonId: number): Promise<VideoSignatureResponse> {
  const response = await apiClient.post<VideoSignatureResponse>(
    TEACHER_PORTAL_ENDPOINTS.LESSON_VIDEO_SIGNATURE(lessonId),
  );
  return VideoSignatureResponseSchema.parse(response.data);
}

/**
 * Confirm video upload completion to the backend
 */
async function confirmUpload(lessonId: number, data: ConfirmVideoUploadRequest): Promise<LessonResponse> {
  const response = await apiClient.patch<LessonResponse>(
    TEACHER_PORTAL_ENDPOINTS.LESSON_VIDEO_CONFIRM(lessonId),
    data,
  );
  return LessonResponseSchema.parse(response.data);
}

/**
 * Delete video from lesson
 */
async function deleteVideo(lessonId: number): Promise<void> {
  await apiClient.delete(TEACHER_PORTAL_ENDPOINTS.LESSON_VIDEO_DELETE(lessonId));
}

/**
 * Reset stuck upload state on backend
 */
async function resetUploadState(lessonId: number): Promise<void> {
  await apiClient.post(TEACHER_PORTAL_ENDPOINTS.LESSON_VIDEO_RESET(lessonId));
}

/**
 * Upload a single chunk with retry logic (exponential backoff)
 */
async function uploadChunkWithRetry(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  signal: AbortSignal,
  onChunkProgress?: (loaded: number, total: number) => void,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const xhr = new XMLHttpRequest();
      const promise = new Promise<Response>((resolve, reject) => {
        xhr.open('POST', url);

        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onChunkProgress) {
            onChunkProgress(event.loaded, event.total);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, { status: xhr.status }));
          } else {
            reject(new Error(`Upload chunk failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during chunk upload'));
        xhr.ontimeout = () => reject(new Error('Chunk upload timed out'));

        // Listen for abort
        const onAbort = () => {
          xhr.abort();
          reject(new DOMException('Upload cancelled', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });

        xhr.send(formData);
      });

      return await promise;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // Don't retry aborts
      }
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      // Exponential backoff: 2s, 4s, 8s
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Upload chunk failed after all retries');
}

/**
 * Upload file to Cloudinary in chunks (direct browser-to-Cloudinary upload)
 */
async function uploadToCloudinary(params: UploadToCloudinaryParams): Promise<CloudinaryUploadResult> {
  const { file, signature, uploadId, onProgress, signal, startFromByte = 0 } = params;
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`;
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  let lastResponse: CloudinaryUploadResult | null = null;
  const startChunk = Math.floor(startFromByte / CHUNK_SIZE);

  for (let i = startChunk; i < totalChunks; i++) {
    if (signal.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError');
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const headers: Record<string, string> = {
      'X-Unique-Upload-Id': uploadId,
      'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
    };

    const response = await uploadChunkWithRetry(
      cloudinaryUrl,
      formData,
      headers,
      signal,
      (loaded, total) => {
        const chunkProgress = loaded / total;
        const overallBytes = start + Math.round(chunkProgress * (end - start));
        const overallPercent = Math.round((overallBytes / totalSize) * 100);
        onProgress(Math.min(overallPercent, 99), overallBytes);
      },
    );

    // The last chunk returns the full Cloudinary response
    if (i === totalChunks - 1) {
      const text = await response.text();
      lastResponse = JSON.parse(text) as CloudinaryUploadResult;
    }
  }

  if (!lastResponse) {
    throw new Error('No response received from Cloudinary');
  }

  onProgress(100, totalSize);
  return lastResponse;
}

export const videoUploadService = {
  getUploadSignature,
  confirmUpload,
  deleteVideo,
  resetUploadState,
  uploadToCloudinary,
};
