import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@admin/environments/environment';
import { COURSE_ENDPOINTS } from '@edumind/shared-utils';
import {
  ApiResponse,
  CourseDetailResponse,
  CourseResponse,
  CreateCourseRequest,
  InstructorStatsResponse,
  PagedResponse,
  UpdateCourseRequest,
} from '@edumind/shared-types';

type SortDirection = 'ASC' | 'DESC';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCourse(payload: CreateCourseRequest): Observable<ApiResponse<CourseResponse>> {
    return this.http.post<ApiResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.CREATE}`,
      payload
    );
  }

  updateCourse(id: number, payload: UpdateCourseRequest): Observable<ApiResponse<CourseResponse>> {
    return this.http.put<ApiResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.UPDATE(id)}`,
      payload
    );
  }

  publishCourse(id: number): Observable<ApiResponse<CourseResponse>> {
    return this.http.post<ApiResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.PUBLISH(id)}`,
      {}
    );
  }

  deleteCourse(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_URL}${COURSE_ENDPOINTS.DELETE(id)}`
    );
  }

  getCourseById(id: number): Observable<ApiResponse<CourseDetailResponse>> {
    return this.http.get<ApiResponse<CourseDetailResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.DETAIL(id)}`
    );
  }

  getCourseBySlug(slug: string): Observable<ApiResponse<CourseDetailResponse>> {
    return this.http.get<ApiResponse<CourseDetailResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.DETAIL_BY_SLUG(slug)}`
    );
  }

  searchCourses(options: {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: SortDirection;
  }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildSearchParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.SEARCH}`,
      { params }
    );
  }

  filterCourses(options: {
    categoryId?: number;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    keyword?: string;
    page?: number;
    size?: number;
  }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildFilterParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.FILTER}`,
      { params }
    );
  }

  getCoursesByCategory(
    categoryId: number,
    options?: { page?: number; size?: number }
  ): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.BY_CATEGORY(categoryId)}`,
      { params }
    );
  }

  getCoursesByInstructor(
    instructorId: number,
    options?: { page?: number; size?: number }
  ): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.BY_INSTRUCTOR(instructorId)}`,
      { params }
    );
  }

  getTopRatedCourses(options?: { page?: number; size?: number }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.TOP_RATED}`,
      { params }
    );
  }

  getMostPopularCourses(options?: { page?: number; size?: number }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.MOST_POPULAR}`,
      { params }
    );
  }

  getNewestCourses(options?: { page?: number; size?: number }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.NEWEST}`,
      { params }
    );
  }

  getFreeCourses(options?: { page?: number; size?: number }): Observable<PagedResponse<CourseResponse>> {
    const params = this.buildPaginationParams(options);
    return this.http.get<PagedResponse<CourseResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.FREE}`,
      { params }
    );
  }

  getInstructorStats(instructorId: number): Observable<ApiResponse<InstructorStatsResponse>> {
    return this.http.get<ApiResponse<InstructorStatsResponse>>(
      `${this.API_URL}${COURSE_ENDPOINTS.INSTRUCTOR_STATS(instructorId)}`
    );
  }

  private buildPaginationParams(options?: { page?: number; size?: number; sortBy?: string }): HttpParams {
    let params = new HttpParams();
    if (options?.page !== undefined) {
      params = params.set('page', options.page.toString());
    }
    if (options?.size !== undefined) {
      params = params.set('size', options.size.toString());
    }
    if (options?.sortBy) {
      params = params.set('sortBy', options.sortBy);
    }
    return params;
  }

  private buildSearchParams(options: {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: SortDirection;
  }): HttpParams {
    let params = this.buildPaginationParams(options);
    if (options.keyword) {
      params = params.set('keyword', options.keyword);
    }
    if (options.sortDir) {
      params = params.set('sortDir', options.sortDir);
    }
    return params;
  }

  private buildFilterParams(options: {
    categoryId?: number;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    keyword?: string;
    page?: number;
    size?: number;
  }): HttpParams {
    let params = this.buildPaginationParams(options);
    if (options.categoryId !== undefined) {
      params = params.set('categoryId', options.categoryId.toString());
    }
    if (options.level) {
      params = params.set('level', options.level);
    }
    if (options.minPrice !== undefined) {
      params = params.set('minPrice', options.minPrice.toString());
    }
    if (options.maxPrice !== undefined) {
      params = params.set('maxPrice', options.maxPrice.toString());
    }
    if (options.keyword) {
      params = params.set('keyword', options.keyword);
    }
    return params;
  }
}

