import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  LedgerPageResponse,
  LedgerListFilters,
  LedgerRecord,
  LedgerSearchSuggestion,
} from '../../shared/models/billing.models';

@Injectable({
  providedIn: 'root',
})
export class LedgerApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/ledger`;

  getLedgerPage(
    filters: LedgerListFilters = {},
  ): Observable<LedgerPageResponse> {
    return this.httpClient.get<LedgerPageResponse>(this.endpoint, {
      params: this.buildParams(filters),
    });
  }

  getLedgerEntry(ledgerEntryId: string): Observable<LedgerRecord> {
    return this.httpClient.get<LedgerRecord>(`${this.endpoint}/${encodeURIComponent(ledgerEntryId)}`);
  }

  getLedgerSuggestions(query: string): Observable<LedgerSearchSuggestion[]> {
    return this.httpClient.get<LedgerSearchSuggestion[]>(
      `${this.endpoint}/suggestions`,
      {
        params: new HttpParams().set('query', query),
      },
    );
  }

  private buildParams(filters: LedgerListFilters): HttpParams {
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
