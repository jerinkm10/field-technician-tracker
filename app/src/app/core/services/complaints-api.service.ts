import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  ComplaintListFilters,
  ComplaintRecord,
  ComplaintUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class ComplaintsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/complaints`;

  getComplaintsPage(
    filters: ComplaintListFilters = {},
  ): Observable<PaginatedResponse<ComplaintRecord>> {
    return this.httpClient.get<PaginatedResponse<ComplaintRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getComplaint(complaintId: string): Observable<ComplaintRecord> {
    return this.httpClient.get<ComplaintRecord>(`${this.endpoint}/${complaintId}`);
  }

  createComplaint(payload: ComplaintUpsertPayload): Observable<ComplaintRecord> {
    return this.httpClient.post<ComplaintRecord>(this.endpoint, payload);
  }

  updateComplaint(
    complaintId: string,
    payload: Partial<ComplaintUpsertPayload>,
  ): Observable<ComplaintRecord> {
    return this.httpClient.patch<ComplaintRecord>(
      `${this.endpoint}/${complaintId}`,
      payload,
    );
  }

  deleteComplaint(complaintId: string): Observable<ComplaintRecord> {
    return this.httpClient.delete<ComplaintRecord>(`${this.endpoint}/${complaintId}`);
  }

  convertToCustomer(complaintId: string): Observable<ComplaintRecord> {
    return this.httpClient.post<ComplaintRecord>(
      `${this.endpoint}/${complaintId}/convert-to-customer`,
      {},
    );
  }

  convertToJob(complaintId: string): Observable<ComplaintRecord> {
    return this.httpClient.post<ComplaintRecord>(
      `${this.endpoint}/${complaintId}/convert-to-job`,
      {},
    );
  }

  private buildParams(filters: ComplaintListFilters): HttpParams {
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
