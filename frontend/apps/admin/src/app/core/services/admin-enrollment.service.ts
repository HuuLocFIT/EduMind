import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ADMIN_ENDPOINTS } from '@edumind/shared-utils';
import {
  AdminMessageResponseSchema,
  EnrollmentReportPagedResponseSchema,
  EnrollmentReportStatsSchema,
  type AdminMessageResponse,
  type EnrollmentReportPagedResponse,
  type EnrollmentReportStats,
  type ReviewReportRequest,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminEnrollmentService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getReports(params?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    page?: number;
    size?: number;
  }): Observable<EnrollmentReportPagedResponse> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http
      .get<EnrollmentReportPagedResponse>(`${this.API_URL}${ADMIN_ENDPOINTS.ENROLLMENT_REPORTS}`, {
        params: httpParams,
      })
      .pipe(map((response) => EnrollmentReportPagedResponseSchema.parse(response)));
  }

  getReportStats(): Observable<EnrollmentReportStats> {
    return this.http
      .get<EnrollmentReportStats>(`${this.API_URL}${ADMIN_ENDPOINTS.ENROLLMENT_REPORT_STATS}`)
      .pipe(map((response) => EnrollmentReportStatsSchema.parse(response)));
  }

  approveReport(reportId: number, adminNotes?: string): Observable<AdminMessageResponse> {
    const payload: ReviewReportRequest = {
      adminNotes: adminNotes || undefined,
    };
    return this.http
      .post<AdminMessageResponse>(
        `${this.API_URL}${ADMIN_ENDPOINTS.ENROLLMENT_REPORT_APPROVE(reportId)}`,
        payload
      )
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }

  rejectReport(reportId: number, adminNotes: string): Observable<AdminMessageResponse> {
    const payload: ReviewReportRequest = {
      adminNotes,
    };
    return this.http
      .post<AdminMessageResponse>(
        `${this.API_URL}${ADMIN_ENDPOINTS.ENROLLMENT_REPORT_REJECT(reportId)}`,
        payload
      )
      .pipe(map((response) => AdminMessageResponseSchema.parse(response)));
  }
}
