import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';

export type TechnicianStatus = 'AVAILABLE' | 'ON_JOB' | 'OFFLINE';
export type JobStatus = 'PENDING' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type LiveMapCustomer = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type LiveMapJob = {
  id: string;
  jobNumber: string;
  title: string;
  status: JobStatus;
  scheduledDate: string | null;
  customer: LiveMapCustomer | null;
};

export type LiveMapUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN';
};

export type LiveMapLocation = {
  id: string;
  technicianId: string;
  jobId: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  batteryLevel: number | null;
  recordedAt: string;
  job: {
    id: string;
    jobNumber: string;
    title: string;
    status: JobStatus;
  } | null;
};

export type LiveMapTechnician = {
  id: string;
  phone: string;
  status: TechnicianStatus;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastSeenAt: string | null;
  user: LiveMapUser;
  activeJob: LiveMapJob | null;
  latestLocation: LiveMapLocation | null;
};

export type TechnicianLocationUpdatedPayload = {
  location: LiveMapLocation;
  technician: {
    id: string;
    phone: string;
    status: TechnicianStatus;
    currentLatitude: number | null;
    currentLongitude: number | null;
    lastSeenAt: string | null;
    user: LiveMapUser;
  };
};

@Injectable({
  providedIn: 'root'
})
export class AdminTrackingService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/admin/live-map`;

  getLiveMap(): Observable<LiveMapTechnician[]> {
    return this.httpClient.get<LiveMapTechnician[]>(this.endpoint, {
      headers: this.authHeaders()
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
      Authorization: `Bearer ${accessToken}`
    });
  }
}
