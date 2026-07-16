import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
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
    return this.httpClient
      .get<CompanyRecord | null>(this.endpoint)
      .pipe(
        map((company): CompanyRecord | null =>
          company ? this.normalizeCompany(company) : null,
        ),
      );
  }

  createCompanySettings(
    payload: CompanyUpsertPayload,
  ): Observable<CompanyRecord> {
    return this.httpClient
      .post<CompanyRecord>(this.endpoint, payload)
      .pipe(map((company) => this.normalizeCompany(company)));
  }

  updateCompanySettings(
    companyId: string,
    payload: Partial<CompanyUpsertPayload>,
  ): Observable<CompanyRecord> {
    return this.httpClient
      .patch<CompanyRecord>(`${this.endpoint}/${companyId}`, payload)
      .pipe(map((company) => this.normalizeCompany(company)));
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

    return this.httpClient.post<UploadAssetResponse>(url, formData).pipe(
      map((response) => ({
        fileUrl: this.normalizeAssetUrl(response.fileUrl) ?? response.fileUrl,
      })),
    );
  }

  private normalizeCompany(company: CompanyRecord): CompanyRecord {
    return {
      ...company,
      logoAttachment: this.normalizeAssetUrl(company.logoAttachment),
      signatureAttachment: this.normalizeAssetUrl(company.signatureAttachment),
      sealAttachment: this.normalizeAssetUrl(company.sealAttachment),
    };
  }

  private normalizeAssetUrl(fileUrl: string | null): string | null {
    if (!fileUrl) {
      return null;
    }

    if (fileUrl.startsWith('/')) {
      return `${appSettings.apiBaseUrl}${fileUrl}`;
    }

    try {
      const url = new URL(fileUrl);
      const apiUrl = new URL(appSettings.apiBaseUrl);

      if (url.pathname.includes('/settings/company/assets/')) {
        return `${apiUrl.origin}${url.pathname}`;
      }
    } catch {
      return fileUrl;
    }

    return fileUrl;
  }
}
