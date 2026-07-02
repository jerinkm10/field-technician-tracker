import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  JobListFilters,
  JobRecord,
  JobUpsertPayload,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class JobsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/admin/jobs`;

  getJobs(filters: JobListFilters = {}): Observable<JobRecord[]> {
    return this.httpClient.get<JobRecord[]>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  createJob(payload: JobUpsertPayload): Observable<JobRecord> {
    return this.httpClient.post<JobRecord>(this.endpoint, payload);
  }

  updateJob(
    jobId: string,
    payload: Partial<JobUpsertPayload>,
  ): Observable<JobRecord> {
    return this.httpClient.patch<JobRecord>(`${this.endpoint}/${jobId}`, payload);
  }

  deleteJob(jobId: string): Observable<JobRecord> {
    return this.httpClient.delete<JobRecord>(`${this.endpoint}/${jobId}`);
  }

  private buildParams(filters: JobListFilters): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value === '')
      ) {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }
}
