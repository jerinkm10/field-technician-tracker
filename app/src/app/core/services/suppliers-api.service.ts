import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export type SupplierRecord = {
  id: string;
  supplierName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
};

export type SupplierUpsertPayload = {
  supplierName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  status: SupplierStatus;
};

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
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.httpClient.get<SupplierRecord[]>(this.endpoint, { params });
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
}
