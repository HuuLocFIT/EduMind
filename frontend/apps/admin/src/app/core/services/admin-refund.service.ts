import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { REFUND_ENDPOINTS } from '@edumind/shared-utils';
import {
  RefundResponseSchema,
  RefundPagedResponseSchema,
  ConfirmManualRefundRequestSchema,
  type RefundResponse,
  type PagedResponse,
  type ConfirmManualRefundRequest,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

export type RefundQueryParams = {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: string;
};

@Injectable({ providedIn: 'root' })
export class AdminRefundService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getPendingRefunds(params: RefundQueryParams = {}): Observable<PagedResponse<RefundResponse>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http
      .get<PagedResponse<RefundResponse>>(`${this.API_URL}${REFUND_ENDPOINTS.ADMIN_PENDING}`, {
        params: httpParams,
      })
      .pipe(map((response) => RefundPagedResponseSchema.parse(response)));
  }

  approveRefund(refundId: number, notes?: string): Observable<RefundResponse> {
    return this.http
      .post<RefundResponse>(
        `${this.API_URL}${REFUND_ENDPOINTS.ADMIN_APPROVE(refundId)}`,
        { notes }
      )
      .pipe(map((res) => RefundResponseSchema.parse(res)));
  }

  rejectRefund(refundId: number, reason: string): Observable<RefundResponse> {
    return this.http
      .post<RefundResponse>(
        `${this.API_URL}${REFUND_ENDPOINTS.ADMIN_REJECT(refundId)}`,
        { reason }
      )
      .pipe(map((res) => RefundResponseSchema.parse(res)));
  }

  confirmManualRefund(refundId: number, bankTransferReference: string): Observable<RefundResponse> {
    const request: ConfirmManualRefundRequest = ConfirmManualRefundRequestSchema.parse({
      bankTransferReference,
    });
    return this.http
      .post<RefundResponse>(
        `${this.API_URL}${REFUND_ENDPOINTS.ADMIN_CONFIRM_MANUAL(refundId)}`,
        request
      )
      .pipe(map((res) => RefundResponseSchema.parse(res)));
  }
}
