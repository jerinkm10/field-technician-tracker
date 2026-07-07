import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  EmployeeTaskListFilters,
  EmployeeTaskRecord,
  EmployeeTaskStatusUpdatePayload,
  EmployeeTaskSummaryResponse,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class EmployeeTasksApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/employee-tasks`;

  getTasksPage(
    filters: EmployeeTaskListFilters = {},
  ): Observable<PaginatedResponse<EmployeeTaskRecord>> {
    return this.httpClient.get<PaginatedResponse<EmployeeTaskRecord>>(
      this.endpoint,
      {
        params: this.buildParams(filters),
      },
    );
  }

  getTaskSummary(): Observable<EmployeeTaskSummaryResponse> {
    return this.httpClient.get<EmployeeTaskSummaryResponse>(
      `${this.endpoint}/summary`,
    );
  }

  updateTaskStatus(
    taskId: string,
    payload: EmployeeTaskStatusUpdatePayload,
  ): Observable<EmployeeTaskRecord> {
    return this.httpClient.patch<EmployeeTaskRecord>(
      `${this.endpoint}/${taskId}/status`,
      payload,
    );
  }

  private buildParams(filters: EmployeeTaskListFilters): HttpParams {
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
