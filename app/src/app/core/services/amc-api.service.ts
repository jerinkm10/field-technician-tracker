import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  AmcCreateInvoiceResponse,
  AmcDashboardSummary,
  AmcListFilters,
  AmcRecord,
  AmcUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class AmcApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/amc`;

  getAmcsPage(
    filters: AmcListFilters = {},
  ): Observable<PaginatedResponse<AmcRecord>> {
    return this.httpClient.get<PaginatedResponse<AmcRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getAmc(amcId: string): Observable<AmcRecord> {
    return this.httpClient.get<AmcRecord>(`${this.endpoint}/${amcId}`);
  }

  createAmc(payload: AmcUpsertPayload): Observable<AmcRecord> {
    return this.httpClient.post<AmcRecord>(this.endpoint, payload);
  }

  updateAmc(
    amcId: string,
    payload: Partial<AmcUpsertPayload>,
  ): Observable<AmcRecord> {
    return this.httpClient.patch<AmcRecord>(`${this.endpoint}/${amcId}`, payload);
  }

  deleteAmc(amcId: string): Observable<AmcRecord> {
    return this.httpClient.delete<AmcRecord>(`${this.endpoint}/${amcId}`);
  }

  createInvoice(amcId: string): Observable<AmcCreateInvoiceResponse> {
    return this.httpClient.post<AmcCreateInvoiceResponse>(
      `${this.endpoint}/${amcId}/create-invoice`,
      {},
    );
  }

  downloadPdf(amcId: string): Observable<Blob> {
    return this.httpClient.get(`${this.endpoint}/${amcId}/pdf`, {
      responseType: 'blob',
    });
  }

  getDashboardSummary(): Observable<AmcDashboardSummary> {
    return this.httpClient.get<AmcDashboardSummary>(
      `${this.endpoint}/dashboard-summary`,
    );
  }

  private buildParams(filters: AmcListFilters): HttpParams {
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
