import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ADMIN_ENDPOINTS,
} from '@edumind/shared-utils';
import {
  AdminCreateUserRequest,
  AdminMessageResponse,
  AdminUpdateUserRoleRequest,
  AdminUserListResponse,
  ReviewApplicationRequest,
  TeacherApplicationDetailResponse,
  TeacherApplicationListResponse,
  TrialTeachersResponse,
  UpgradeTrialRequest,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  createTeacher(payload: AdminCreateUserRequest): Observable<AdminMessageResponse> {
    return this.http.post<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USER_CREATE_TEACHER}`,
      payload
    );
  }

  createAdmin(payload: AdminCreateUserRequest): Observable<AdminMessageResponse> {
    return this.http.post<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USER_CREATE_ADMIN}`,
      payload
    );
  }

  getUsers(options?: { page?: number; size?: number; sortBy?: string }): Observable<AdminUserListResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<AdminUserListResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USERS}`, {
      params,
    });
  }

  getUsersByRole(
    roleName: string,
    options?: { page?: number; size?: number; isActive?: boolean }
  ): Observable<AdminUserListResponse> {
    let params = this.buildPaginationParams(options);
    if (options?.isActive !== undefined) {
      params = params.set('isActive', String(options.isActive));
    }
    return this.http.get<AdminUserListResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USERS_BY_ROLE(roleName)}`,
      { params }
    );
  }

  updateUserRoles(
    userId: number,
    payload: AdminUpdateUserRoleRequest
  ): Observable<AdminMessageResponse> {
    return this.http.put<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USER_UPDATE_ROLES(userId)}`,
      payload
    );
  }

  toggleUserStatus(userId: number, enabled: boolean): Observable<AdminMessageResponse> {
    const params = new HttpParams().set('enabled', String(enabled));
    return this.http.patch<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USER_TOGGLE_STATUS(userId)}`,
      {},
      { params }
    );
  }

  deleteUser(userId: number): Observable<AdminMessageResponse> {
    return this.http.delete<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.USER_DELETE(userId)}`
    );
  }

  getApplications(options?: {
    status?: string | null;
    page?: number;
    size?: number;
    sortBy?: string;
  }): Observable<TeacherApplicationListResponse> {
    let params = this.buildPaginationParams(options);
    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.sortBy) {
      params = params.set('sortBy', options.sortBy);
    }

    return this.http.get<TeacherApplicationListResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.APPLICATIONS}`,
      { params }
    );
  }

  getApplicationById(id: number): Observable<TeacherApplicationDetailResponse> {
    return this.http.get<TeacherApplicationDetailResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.APPLICATION_DETAIL(id)}`
    );
  }

  reviewApplication(
    id: number,
    payload: ReviewApplicationRequest
  ): Observable<AdminMessageResponse> {
    return this.http.post<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.APPLICATION_REVIEW(id)}`,
      payload
    );
  }

  getTrialTeachers(options?: {
    page?: number;
    size?: number;
  }): Observable<TrialTeachersResponse> {
    const params = this.buildPaginationParams(options);
    return this.http.get<TrialTeachersResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.TRIAL_TEACHERS}`,
      { params }
    );
  }

  upgradeTrialToFull(
    userId: number,
    payload?: UpgradeTrialRequest
  ): Observable<AdminMessageResponse> {
    return this.http.post<AdminMessageResponse>(
      `${this.API_URL}${ADMIN_ENDPOINTS.TRIAL_TEACHER_UPGRADE(userId)}`,
      payload ?? {}
    );
  }

  private buildPaginationParams(options?: {
    page?: number;
    size?: number;
    sortBy?: string;
  }): HttpParams {
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
}

