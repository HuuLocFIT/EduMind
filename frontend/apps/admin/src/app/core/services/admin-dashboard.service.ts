import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ADMIN_ENDPOINTS } from '@edumind/shared-utils';
import {
  DashboardStats,
  DashboardStatsSchema,
} from '@edumind/shared-types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly API_URL = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getDashboardStats(): Observable<DashboardStats> {
    return this.http
      .get<DashboardStats>(`${this.API_URL}${ADMIN_ENDPOINTS.DASHBOARD_STATS}`)
      .pipe(
        map((response) => {
          // Validate response with Zod schema
          return DashboardStatsSchema.parse(response);
        })
      );
  }
}
