import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  PaginatedResponse,
  SupplierListFilters,
  SupplierRecord,
  SupplierStatus,
  SupplierUpsertPayload,
} from '../../shared/models/billing.models';

export type { SupplierRecord, SupplierStatus, SupplierUpsertPayload };

@Injectable({
  providedIn: 'root',
})
export class SuppliersApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/suppliers`;

  listSuppliers(
    search?: string,
    status?: SupplierStatus,
  ): Observable<SupplierRecord[]> {
    return this.getSuppliersPage({
      search,
      status,
      limit: 10,
    }).pipe(map((response) => response.data));
  }

  getSuppliersPage(
    filters: SupplierListFilters = {},
  ): Observable<PaginatedResponse<SupplierRecord>> {
    return this.httpClient.get<PaginatedResponse<SupplierRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  searchSuppliers(search: string): Observable<SupplierRecord[]> {
    return this.getSuppliersPage({
      search,
      status: 'ACTIVE',
      limit: 10,
    }).pipe(map((response) => response.data));
  }

  getSupplier(supplierId: string): Observable<SupplierRecord> {
    return this.httpClient.get<SupplierRecord>(`${this.endpoint}/${supplierId}`);
  }

  createSupplier(payload: SupplierUpsertPayload): Observable<SupplierRecord> {
    return this.httpClient.post<SupplierRecord>(this.endpoint, payload);
  }

  updateSupplier(
    supplierId: string,
    payload: Partial<SupplierUpsertPayload>,
  ): Observable<SupplierRecord> {
    return this.httpClient.patch<SupplierRecord>(
      `${this.endpoint}/${supplierId}`,
      payload,
    );
  }

  deleteSupplier(supplierId: string): Observable<SupplierRecord> {
    return this.httpClient.delete<SupplierRecord>(`${this.endpoint}/${supplierId}`);
  }

  private buildParams(filters: SupplierListFilters): HttpParams {
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
