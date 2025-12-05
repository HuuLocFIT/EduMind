import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@admin/environments/environment';
import { CATEGORY_ENDPOINTS } from '@edumind/shared-utils';
import {
  ApiResponse,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@edumind/shared-types';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCategory(payload: CreateCategoryRequest): Observable<ApiResponse<CategoryResponse>> {
    return this.http.post<ApiResponse<CategoryResponse>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.CREATE}`,
      payload
    );
  }

  updateCategory(id: number, payload: UpdateCategoryRequest): Observable<ApiResponse<CategoryResponse>> {
    return this.http.put<ApiResponse<CategoryResponse>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.UPDATE(id)}`,
      payload
    );
  }

  deleteCategory(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.DELETE(id)}`
    );
  }

  getCategoryById(id: number): Observable<ApiResponse<CategoryResponse>> {
    return this.http.get<ApiResponse<CategoryResponse>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.DETAIL(id)}`
    );
  }

  getActiveCategories(): Observable<ApiResponse<CategoryResponse[]>> {
    return this.http.get<ApiResponse<CategoryResponse[]>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.ACTIVE}`
    );
  }

  getAllCategories(): Observable<ApiResponse<CategoryResponse[]>> {
    return this.http.get<ApiResponse<CategoryResponse[]>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.ALL}`
    );
  }

  getCategoriesWithCourses(): Observable<ApiResponse<CategoryResponse[]>> {
    return this.http.get<ApiResponse<CategoryResponse[]>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.WITH_COURSES}`
    );
  }

  toggleCategoryStatus(id: number): Observable<ApiResponse<CategoryResponse>> {
    return this.http.patch<ApiResponse<CategoryResponse>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.TOGGLE_STATUS(id)}`,
      {}
    );
  }
}

