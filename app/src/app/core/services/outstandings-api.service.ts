import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  OutstandingListFilters,
  OutstandingRecord,
  OutstandingUpdatePayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class OutstandingsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/outstandings`;

  getOutstandingsPage(
    filters: OutstandingListFilters = {},
  ): Observable<PaginatedResponse<OutstandingRecord>> {
    return this.httpClient.get<PaginatedResponse<OutstandingRecord>>(
      this.endpoint,
      {
        params: this.buildParams(filters),
      },
    );
  }

  getOutstanding(outstandingId: string): Observable<OutstandingRecord> {
    return this.httpClient.get<OutstandingRecord>(`${this.endpoint}/${outstandingId}`);
  }

  updateOutstanding(
    outstandingId: string,
    payload: OutstandingUpdatePayload,
  ): Observable<OutstandingRecord> {
    return this.httpClient.patch<OutstandingRecord>(
      `${this.endpoint}/${outstandingId}`,
      payload,
    );
  }

  deleteOutstanding(outstandingId: string): Observable<OutstandingRecord> {
    return this.httpClient.delete<OutstandingRecord>(`${this.endpoint}/${outstandingId}`);
  }

  private buildParams(filters: OutstandingListFilters): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }
}
