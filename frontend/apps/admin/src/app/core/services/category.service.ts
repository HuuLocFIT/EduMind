import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CATEGORY_ENDPOINTS } from '@edumind/shared-utils';
import {
  ApiResponse,
  CategoryListResponse,
  CategoryListResponseSchema,
  CategoryResponse,
  CategoryResponseSchema,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@edumind/shared-types';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly API_URL = environment.apiUrl;

  private readonly http = inject(HttpClient);

  createCategory(payload: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.CREATE}`,
      payload
    ).pipe(map((response: CategoryResponse) => CategoryResponseSchema.parse(response)));
  }

  updateCategory(id: number, payload: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.UPDATE(id)}`,
      payload
    ).pipe(map((response: CategoryResponse) => CategoryResponseSchema.parse(response)));
  }

  deleteCategory(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.DELETE(id)}`
    );
  }

  getCategoryById(id: number): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.DETAIL(id)}`
    ).pipe(map((response: CategoryResponse) => CategoryResponseSchema.parse(response)));
  }

  getActiveCategories(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.ACTIVE}`
    ).pipe(map((response: CategoryListResponse) => CategoryListResponseSchema.parse(response)));
  }

  getAllCategories(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.ALL}`
    ).pipe(map((response: CategoryListResponse) => CategoryListResponseSchema.parse(response)));
  }

  getCategoriesWithCourses(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.WITH_COURSES}`
    ).pipe(map((response: CategoryListResponse) => CategoryListResponseSchema.parse(response)));
  }

  toggleCategoryStatus(id: number): Observable<CategoryResponse> {
    return this.http.patch<CategoryResponse>(
      `${this.API_URL}${CATEGORY_ENDPOINTS.TOGGLE_STATUS(id)}`,
      {}
    ).pipe(map((response: CategoryResponse) => CategoryResponseSchema.parse(response)));
  }
}

