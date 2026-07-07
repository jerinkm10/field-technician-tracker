import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  InvoiceInputFieldListFilters,
  InvoiceInputFieldRecord,
  InvoiceInputFieldUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class InvoiceInputFieldsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/invoice-input-fields`;

  getInvoiceInputFieldsPage(
    filters: InvoiceInputFieldListFilters = {},
  ): Observable<PaginatedResponse<InvoiceInputFieldRecord>> {
    return this.httpClient.get<PaginatedResponse<InvoiceInputFieldRecord>>(
      this.endpoint,
      {
        params: this.buildParams(filters),
      },
    );
  }

  createInvoiceInputField(
    payload: InvoiceInputFieldUpsertPayload,
  ): Observable<InvoiceInputFieldRecord> {
    return this.httpClient.post<InvoiceInputFieldRecord>(this.endpoint, payload);
  }

  updateInvoiceInputField(
    fieldId: string,
    payload: Partial<InvoiceInputFieldUpsertPayload>,
  ): Observable<InvoiceInputFieldRecord> {
    return this.httpClient.patch<InvoiceInputFieldRecord>(
      `${this.endpoint}/${fieldId}`,
      payload,
    );
  }

  deleteInvoiceInputField(fieldId: string): Observable<InvoiceInputFieldRecord> {
    return this.httpClient.delete<InvoiceInputFieldRecord>(
      `${this.endpoint}/${fieldId}`,
    );
  }

  private buildParams(filters: InvoiceInputFieldListFilters): HttpParams {
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
