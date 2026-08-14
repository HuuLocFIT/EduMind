import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PAYOUT_ENDPOINTS } from '@edumind/shared-utils';
import {
  PayoutResponseSchema,
  PayoutPagedResponseSchema,
  ConfirmManualPayoutRequestSchema,
  type PayoutResponse,
  type CreatePayoutRequest,
  type UpdatePayoutRecipient,
  type ConfirmManualPayoutRequest,
  type PagedResponse,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

export type PayoutQueryParams = {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
};

@Injectable({ providedIn: 'root' })
export class AdminPayoutService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getPendingPayouts(params: PayoutQueryParams = {}): Observable<PagedResponse<PayoutResponse>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http
      .get<PagedResponse<PayoutResponse>>(`${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_PENDING}`, {
        params: httpParams,
      })
      .pipe(map((response) => PayoutPagedResponseSchema.parse(response)));
  }

  getAllPayouts(params: PayoutQueryParams = {}): Observable<PagedResponse<PayoutResponse>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http
      .get<PagedResponse<PayoutResponse>>(`${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_ALL}`, {
        params: httpParams,
      })
      .pipe(map((response) => PayoutPagedResponseSchema.parse(response)));
  }

  createPayout(data: CreatePayoutRequest): Observable<PayoutResponse> {
    return this.http
      .post<PayoutResponse>(
        `${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_CREATE}`,
        data
      )
      .pipe(map((res) => PayoutResponseSchema.parse(res)));
  }

  updatePayoutRecipient(payoutId: number, data: UpdatePayoutRecipient): Observable<PayoutResponse> {
    return this.http
      .put<PayoutResponse>(
        `${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_UPDATE(payoutId)}`,
        data
      )
      .pipe(map((res) => PayoutResponseSchema.parse(res)));
  }

  processPayout(payoutId: number): Observable<PayoutResponse> {
    return this.http
      .post<PayoutResponse>(
        `${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_PROCESS(payoutId)}`,
        {}
      )
      .pipe(map((res) => PayoutResponseSchema.parse(res)));
  }

  confirmManualPayout(payoutId: number, bankTransferReference: string): Observable<PayoutResponse> {
    const request: ConfirmManualPayoutRequest = ConfirmManualPayoutRequestSchema.parse({
      bankTransferReference,
    });
    return this.http
      .post<PayoutResponse>(
        `${this.API_URL}${PAYOUT_ENDPOINTS.ADMIN_CONFIRM_MANUAL(payoutId)}`,
        request
      )
      .pipe(map((res) => PayoutResponseSchema.parse(res)));
  }
}
