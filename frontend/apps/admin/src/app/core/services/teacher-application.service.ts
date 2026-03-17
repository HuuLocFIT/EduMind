import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ADMIN_ENDPOINTS } from '@edumind/shared-utils';
import {
  AdminMessageResponse,
  AdminMessageResponseSchema,
  ApplicationStats,
  ApplicationStatsSchema,
  ReviewApplicationRequest,
  TeacherApplicationListResponse,
  TeacherApplicationListResponseSchema,
  TeacherApplicationResponse,
  TeacherApplicationResponseSchema,
  TrialTeachersResponse,
  TrialTeachersResponseSchema,
  UpgradeTrialRequest,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

export type ApplicationQueryParams = {
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  search?: string;
};

@Injectable({
  providedIn: 'root',
})
export class TeacherApplicationService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getApplications(params: ApplicationQueryParams = {}): Observable<TeacherApplicationListResponse> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http
      .get<TeacherApplicationListResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.APPLICATIONS}`, {
        params: httpParams,
      })
      .pipe(
        map((response: TeacherApplicationListResponse) =>
          TeacherApplicationListResponseSchema.parse(response)
        )
      );
  }

  getApplicationById(id: number): Observable<TeacherApplicationResponse> {
    return this.http
      .get<TeacherApplicationResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.APPLICATION_DETAIL(id)}`)
      .pipe(
        map((response: TeacherApplicationResponse) =>
          TeacherApplicationResponseSchema.parse(response)
        )
      );
  }

  reviewApplication(
    id: number,
    payload: ReviewApplicationRequest
  ): Observable<AdminMessageResponse> {
    return this.http
      .post<AdminMessageResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.APPLICATION_REVIEW(id)}`, payload)
      .pipe(map((response: AdminMessageResponse) => AdminMessageResponseSchema.parse(response)));
  }

  getTrialTeachers(options?: { page?: number; size?: number; search?: string; expiringSoon?: boolean }): Observable<TrialTeachersResponse> {
    let params = new HttpParams();
    if (options?.page !== undefined) {
      params = params.set('page', options.page.toString());
    }
    if (options?.size !== undefined) {
      params = params.set('size', options.size.toString());
    }
    if (options?.search) {
      params = params.set('search', options.search);
    }
    if (options?.expiringSoon) {
      params = params.set('expiringSoon', 'true');
    }

    return this.http
      .get<TrialTeachersResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.TRIAL_TEACHERS}`, { params })
      .pipe(
        map((response: TrialTeachersResponse) => TrialTeachersResponseSchema.parse(response))
      );
  }

  getStats(): Observable<ApplicationStats> {
    return this.http
      .get<ApplicationStats>(`${this.API_URL}${ADMIN_ENDPOINTS.APPLICATION_STATS}`)
      .pipe(map((response: ApplicationStats) => ApplicationStatsSchema.parse(response)));
  }

  upgradeTrialToFull(
    userId: number,
    payload?: UpgradeTrialRequest
  ): Observable<AdminMessageResponse> {
    return this.http
      .post<AdminMessageResponse>(
        `${this.API_URL}${ADMIN_ENDPOINTS.TRIAL_TEACHER_UPGRADE(userId)}`,
        payload ?? {}
      )
      .pipe(map((response: AdminMessageResponse) => AdminMessageResponseSchema.parse(response)));
  }
}


