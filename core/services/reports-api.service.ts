import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';

export type ReportJobStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TechnicianDailyReportRow = {
  technicianId: string;
  technicianName: string;
  totalJobs: number;
  completedJobs: number;
  totalTravelDistance: number;
  totalSiteTime: number;
  firstLocationTime: string | null;
  lastLocationTime: string | null;
};

export type TechnicianDailyReportFilters = {
  technicianId?: string;
  date?: string;
  status?: ReportJobStatus | '';
};

@Injectable({
  providedIn: 'root'
})
export class ReportsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/reports/technician-daily`;

  getTechnicianDailyReport(
    filters: TechnicianDailyReportFilters
  ): Observable<TechnicianDailyReportRow[]> {
    let params = new HttpParams();

    if (filters.technicianId) {
      params = params.set('technicianId', filters.technicianId);
    }

    if (filters.date) {
      params = params.set('date', filters.date);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    return this.httpClient.get<TechnicianDailyReportRow[]>(this.endpoint, {
      params,
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders {
    const accessToken =
      localStorage.getItem('accessToken') ??
      localStorage.getItem('token') ??
      localStorage.getItem('jwtToken');

    if (!accessToken) {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });
  }
}
