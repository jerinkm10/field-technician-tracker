import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import { DashboardBusinessSummaryResponse } from '../../shared/models/billing.models';

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
}
