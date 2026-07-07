import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  NotificationListResponse,
  NotificationRecord,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/notifications`;

  getNotifications(filters: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  } = {}): Observable<NotificationListResponse> {
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

    return this.httpClient.get<NotificationListResponse>(this.endpoint, { params });
  }

  markAsRead(notificationId: string): Observable<NotificationRecord> {
    return this.httpClient.patch<NotificationRecord>(
      `${this.endpoint}/${notificationId}/read`,
      {},
    );
  }

  markAllAsRead(): Observable<{ updatedCount: number }> {
    return this.httpClient.patch<{ updatedCount: number }>(
      `${this.endpoint}/read-all`,
      {},
    );
  }
}
