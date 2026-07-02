import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  DashboardBusinessSummaryResponse,
  DashboardEmployeeSummaryResponse,
  DashboardPerformanceResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/dashboard`;

  getBusinessSummary(): Observable<DashboardBusinessSummaryResponse> {
    return this.httpClient.get<DashboardBusinessSummaryResponse>(
      `${this.endpoint}/business-summary`,
    );
  }

  getEmployeeSummary(): Observable<DashboardEmployeeSummaryResponse> {
    return this.httpClient.get<DashboardEmployeeSummaryResponse>(
      `${this.endpoint}/employee-summary`,
    );
  }

  getPerformance(filters: {
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Observable<DashboardPerformanceResponse> {
    const params = Object.entries(filters).reduce((httpParams, [key, value]) => {
      if (value) {
        return httpParams.set(key, value);
      }

      return httpParams;
    }, new HttpParams());

    return this.httpClient.get<DashboardPerformanceResponse>(
      `${this.endpoint}/performance`,
      { params },
    );
  }
}
