import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  LeadImportPreviewResponse,
  LeadListFilters,
  LeadNoteRecord,
  LeadRecord,
  LeadStatusUpdatePayload,
  LeadUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class LeadsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/leads`;

  getLeadsPage(
    filters: LeadListFilters = {},
  ): Observable<PaginatedResponse<LeadRecord>> {
    return this.httpClient.get<PaginatedResponse<LeadRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getLead(leadId: string): Observable<LeadRecord> {
    return this.httpClient.get<LeadRecord>(`${this.endpoint}/${leadId}`);
  }

  createLead(payload: LeadUpsertPayload): Observable<LeadRecord> {
    return this.httpClient.post<LeadRecord>(this.endpoint, payload);
  }

  updateLead(
    leadId: string,
    payload: Partial<LeadUpsertPayload>,
  ): Observable<LeadRecord> {
    return this.httpClient.patch<LeadRecord>(`${this.endpoint}/${leadId}`, payload);
  }

  deleteLead(leadId: string): Observable<LeadRecord> {
    return this.httpClient.delete<LeadRecord>(`${this.endpoint}/${leadId}`);
  }

  updateLeadStatus(
    leadId: string,
    payload: LeadStatusUpdatePayload,
  ): Observable<LeadRecord> {
    return this.httpClient.patch<LeadRecord>(
      `${this.endpoint}/${leadId}/status`,
      payload,
    );
  }

  getLeadNotes(leadId: string): Observable<LeadNoteRecord[]> {
    return this.httpClient.get<LeadNoteRecord[]>(`${this.endpoint}/${leadId}/notes`);
  }

  addLeadNote(
    leadId: string,
    note: string,
  ): Observable<LeadNoteRecord> {
    return this.httpClient.post<LeadNoteRecord>(`${this.endpoint}/${leadId}/notes`, {
      note,
    });
  }

  importLeads(
    file: File,
    commit = false,
  ): Observable<LeadImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('commit', String(commit));

    return this.httpClient.post<LeadImportPreviewResponse>(
      `${this.endpoint}/import`,
      formData,
    );
  }

  downloadDemoExcel(): Observable<Blob> {
    return this.httpClient.get(`${this.endpoint}/demo-excel`, {
      responseType: 'blob',
    });
  }

  private buildParams(filters: LeadListFilters): HttpParams {
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
