import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  EmployeeListFilters,
  EmployeeRecord,
  EmployeeUpsertPayload,
  PaginatedResponse,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class EmployeesApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/employees`;

  getEmployeesPage(
    filters: EmployeeListFilters = {},
  ): Observable<PaginatedResponse<EmployeeRecord>> {
    return this.httpClient.get<PaginatedResponse<EmployeeRecord>>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getEmployee(employeeId: string): Observable<EmployeeRecord> {
    return this.httpClient.get<EmployeeRecord>(`${this.endpoint}/${employeeId}`);
  }

  createEmployee(payload: EmployeeUpsertPayload): Observable<EmployeeRecord> {
    return this.httpClient.post<EmployeeRecord>(this.endpoint, payload);
  }

  updateEmployee(
    employeeId: string,
    payload: Partial<EmployeeUpsertPayload>,
  ): Observable<EmployeeRecord> {
    return this.httpClient.patch<EmployeeRecord>(
      `${this.endpoint}/${employeeId}`,
      payload,
    );
  }

  private buildParams(filters: EmployeeListFilters): HttpParams {
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
