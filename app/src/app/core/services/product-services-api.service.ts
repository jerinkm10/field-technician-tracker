import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  PaginatedResponse,
  ProductServiceListFilters,
  ProductServiceRecord,
  ProductServiceUpsertPayload,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class ProductServicesApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/products-services`;

  getProductServicesPage(
    filters: ProductServiceListFilters = {},
  ): Observable<PaginatedResponse<ProductServiceRecord>> {
    return this.httpClient.get<PaginatedResponse<ProductServiceRecord>>(
      this.endpoint,
      {
        params: this.buildParams(filters),
      },
    );
  }

  getProductService(productServiceId: string): Observable<ProductServiceRecord> {
    return this.httpClient.get<ProductServiceRecord>(
      `${this.endpoint}/${productServiceId}`,
    );
  }

  createProductService(
    payload: ProductServiceUpsertPayload,
  ): Observable<ProductServiceRecord> {
    return this.httpClient.post<ProductServiceRecord>(this.endpoint, payload);
  }

  updateProductService(
    productServiceId: string,
    payload: Partial<ProductServiceUpsertPayload>,
  ): Observable<ProductServiceRecord> {
    return this.httpClient.patch<ProductServiceRecord>(
      `${this.endpoint}/${productServiceId}`,
      payload,
    );
  }

  deleteProductService(productServiceId: string): Observable<ProductServiceRecord> {
    return this.httpClient.delete<ProductServiceRecord>(
      `${this.endpoint}/${productServiceId}`,
    );
  }

  private buildParams(filters: ProductServiceListFilters): HttpParams {
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
