import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UPLOAD_ENDPOINTS } from '@edumind/shared-utils';
import { FileUploadResponse, FileUploadResponseSchema } from '@edumind/shared-types';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private readonly API_URL = environment.apiUrl;

  private readonly http = inject(HttpClient);

  uploadImage(
    file: File,
    folder = 'images/avatars',
    maxWidth = 500,
    maxHeight = 500,
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('maxWidth', String(maxWidth));
    formData.append('maxHeight', String(maxHeight));

    return this.http
      .post<FileUploadResponse>(`${this.API_URL}${UPLOAD_ENDPOINTS.IMAGE}`, formData)
      .pipe(map((response) => FileUploadResponseSchema.parse(response)));
  }

  uploadIcon(file: File, folder = 'images/icons'): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.http
      .post<FileUploadResponse>(`${this.API_URL}${UPLOAD_ENDPOINTS.ICON}`, formData)
      .pipe(map((response) => FileUploadResponseSchema.parse(response)));
  }
}
