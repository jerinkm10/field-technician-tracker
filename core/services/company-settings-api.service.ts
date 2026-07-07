import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import { CompanyRecord, CompanyUpsertPayload } from '../../shared/models/billing.models';

type UploadAssetResponse = {
  fileUrl: string;
};

@Injectable({
  providedIn: 'root',
})
export class CompanySettingsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/settings/company`;

  getCompanySettings(): Observable<CompanyRecord | null> {
    return this.httpClient.get<CompanyRecord | null>(this.endpoint);
  }

  createCompanySettings(
    payload: CompanyUpsertPayload,
  ): Observable<CompanyRecord> {
    return this.httpClient.post<CompanyRecord>(this.endpoint, payload);
  }

  updateCompanySettings(
    companyId: string,
    payload: Partial<CompanyUpsertPayload>,
  ): Observable<CompanyRecord> {
    return this.httpClient.patch<CompanyRecord>(
      `${this.endpoint}/${companyId}`,
      payload,
    );
  }

  uploadLogo(file: File): Observable<UploadAssetResponse> {
    return this.uploadFile(`${this.endpoint}/logo`, file);
  }

  uploadSignature(file: File): Observable<UploadAssetResponse> {
    return this.uploadFile(`${this.endpoint}/signature`, file);
  }

  uploadSeal(file: File): Observable<UploadAssetResponse> {
    return this.uploadFile(`${this.endpoint}/seal`, file);
  }

  private uploadFile(url: string, file: File): Observable<UploadAssetResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpClient.post<UploadAssetResponse>(url, formData);
  }
}
