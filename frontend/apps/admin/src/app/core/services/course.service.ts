import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { COURSE_ENDPOINTS } from '@edumind/shared-utils';
import {
  CourseDetailResponse,
  CourseDetailResponseSchema,
  CourseResponse,
  CourseResponseSchema,
  CreateCourseRequest,
  createPagedResponseSchema,
  InstructorStatsResponse,
  InstructorStatsResponseSchema,
  PagedResponse,
  UpdateCourseRequest,
} from '@edumind/shared-types';
import { z } from 'zod';

type SortDirection = 'ASC' | 'DESC';
const CoursePagedResponseSchema = createPagedResponseSchema(CourseResponseSchema);
export type CoursePagedResponse = z.infer<typeof CoursePagedResponseSchema> & PagedResponse<CourseResponse>;

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly API_URL = environment.apiUrl;

  private readonly http = inject(HttpClient);

  createCourse(payload: CreateCourseRequest): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.CREATE}`,
      payload
    ).pipe(map((response: CourseResponse) => CourseResponseSchema.parse(response)));
  }

  updateCourse(id: number, payload: UpdateCourseRequest): Observable<CourseResponse> {
    return this.http.put<CourseResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.UPDATE(id)}`,
      payload
    ).pipe(map((response: CourseResponse) => CourseResponseSchema.parse(response)));
  }

  publishCourse(id: number): Observable<CourseResponse> {
    return this.http.post<CourseResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.PUBLISH(id)}`,
      {}
    ).pipe(map((response: CourseResponse) => CourseResponseSchema.parse(response)));
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${COURSE_ENDPOINTS.DELETE(id)}`
    );
  }

  getCourseById(id: number): Observable<CourseDetailResponse> {
    return this.http.get<CourseDetailResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.DETAIL(id)}`
    ).pipe(map((response: CourseDetailResponse) => CourseDetailResponseSchema.parse(response)));
  }

  getCourseBySlug(slug: string): Observable<CourseDetailResponse> {
    return this.http.get<CourseDetailResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.DETAIL_BY_SLUG(slug)}`
    ).pipe(map((response: CourseDetailResponse) => CourseDetailResponseSchema.parse(response)));
  }

  searchCourses(options: {
    keyword?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: SortDirection;
  }): Observable<CoursePagedResponse> {
    const params = this.buildSearchParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.SEARCH}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  filterCourses(options: {
    categoryId?: number;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    keyword?: string;
    page?: number;
    size?: number;
  }): Observable<CoursePagedResponse> {
    const params = this.buildFilterParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.FILTER}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getCoursesByCategory(
    categoryId: number,
    options?: { page?: number; size?: number }
  ): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.BY_CATEGORY(categoryId)}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getCoursesByInstructor(
    instructorId: number,
    options?: { page?: number; size?: number }
  ): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.BY_INSTRUCTOR(instructorId)}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getTopRatedCourses(options?: { page?: number; size?: number }): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.TOP_RATED}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getMostPopularCourses(options?: { page?: number; size?: number }): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.MOST_POPULAR}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getNewestCourses(options?: { page?: number; size?: number }): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.NEWEST}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getFreeCourses(options?: { page?: number; size?: number }): Observable<CoursePagedResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<CoursePagedResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.FREE}`,
      { params }
    ).pipe(map((response: CoursePagedResponse) => CoursePagedResponseSchema.parse(response)));
  }

  getInstructorStats(instructorId: number): Observable<InstructorStatsResponse> {
    return this.http.get<InstructorStatsResponse>(
      `${this.API_URL}${COURSE_ENDPOINTS.INSTRUCTOR_STATS(instructorId)}`
    ).pipe(map((response: InstructorStatsResponse) => InstructorStatsResponseSchema.parse(response)));
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

