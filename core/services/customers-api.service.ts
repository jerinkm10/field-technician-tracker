import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  CustomerListFilters,
  CustomerRecord,
  CustomerUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class CustomersApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/customers`;

  listCustomers(
    search?: string,
  ): Observable<CustomerRecord[]> {
    return this.getCustomersPage({
      search,
      status: 'ACTIVE',
      limit: 10,
    }).pipe(map((response) => response.data));
  }

  getCustomersPage(
    filters: CustomerListFilters = {},
  ): Observable<PaginatedResponse<CustomerRecord>> {
    return this.httpClient.get<PaginatedResponse<CustomerRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getCustomer(customerId: string): Observable<CustomerRecord> {
    return this.httpClient.get<CustomerRecord>(`${this.endpoint}/${customerId}`);
  }

  createCustomer(payload: CustomerUpsertPayload): Observable<CustomerRecord> {
    return this.httpClient.post<CustomerRecord>(this.endpoint, payload);
  }

  updateCustomer(
    customerId: string,
    payload: Partial<CustomerUpsertPayload>,
  ): Observable<CustomerRecord> {
    return this.httpClient.patch<CustomerRecord>(
      `${this.endpoint}/${customerId}`,
      payload,
    );
  }

  deleteCustomer(customerId: string): Observable<CustomerRecord> {
    return this.httpClient.delete<CustomerRecord>(`${this.endpoint}/${customerId}`);
  }

  private buildParams(filters: CustomerListFilters): HttpParams {
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
