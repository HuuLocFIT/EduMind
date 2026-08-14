import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  ADMIN_ENDPOINTS,
} from '@edumind/shared-utils';
import {
  AdminMessageResponseSchema,
  AdminUserListResponseSchema,
  UserRoleStatsSchema,
  type AdminCreateUserRequest,
  type AdminMessageResponse,
  type AdminUpdateUserRoleRequest,
  type AdminUserListResponse,
  type UserRoleStats,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  createTeacher(payload: AdminCreateUserRequest): Observable<AdminMessageResponse> {
    return this.http
      .post<AdminMessageResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USER_CREATE_TEACHER}`, payload)
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  createAdmin(payload: AdminCreateUserRequest): Observable<AdminMessageResponse> {
    return this.http
      .post<AdminMessageResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USER_CREATE_ADMIN}`, payload)
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  getUsers(options?: { page?: number; size?: number; sortBy?: string }): Observable<AdminUserListResponse> {
    const params = this.buildPaginationParams(options);
    return this.http
      .get<AdminUserListResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USERS}`, { params })
      .pipe(map((response) => AdminUserListResponseSchema.parse(response)));
  }

  getUsersByRole(
    roleName: string,
    options?: { page?: number; size?: number; isActive?: boolean; search?: string }
  ): Observable<AdminUserListResponse> {
    let params = this.buildPaginationParams(options);
    if (options?.isActive !== undefined) {
      params = params.set('isActive', String(options.isActive));
    }
    if (options?.search) {
      params = params.set('search', options.search);
    }
    return this.http
      .get<AdminUserListResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USERS_BY_ROLE(roleName)}`, {
        params,
      })
      .pipe(map((response) => AdminUserListResponseSchema.parse(response)));
  }

  updateUserRoles(
    userId: number,
    payload: AdminUpdateUserRoleRequest
  ): Observable<AdminMessageResponse> {
    return this.http
      .put<AdminMessageResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USER_UPDATE_ROLES(userId)}`, payload)
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  toggleUserStatus(userId: number, enabled: boolean): Observable<AdminMessageResponse> {
    const params = new HttpParams().set('enabled', String(enabled));
    return this.http
      .patch<AdminMessageResponse>(
        `${this.API_URL}${ADMIN_ENDPOINTS.USER_TOGGLE_STATUS(userId)}`,
        {},
        { params }
      )
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  deleteUser(userId: number): Observable<AdminMessageResponse> {
    return this.http
      .delete<AdminMessageResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.USER_DELETE(userId)}`)
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  getUserRoleStats(roleName: string): Observable<UserRoleStats> {
    return this.http
      .get<UserRoleStats>(`${this.API_URL}${ADMIN_ENDPOINTS.USER_ROLE_STATS(roleName)}`)
      .pipe(map((response) => UserRoleStatsSchema.parse(response)));
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

