import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import { SupplierRecord } from './suppliers-api.service';

export type InvoiceType = 'PROFORMA' | 'TAX';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export type InvoiceLineItemRecord = {
  id: string;
  invoiceId: string;
  productServiceName: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  cgstAmount: number;
  cgstPercentage: number;
  sgstAmount: number;
  sgstPercentage: number;
  lineAmount: number;
};

export type InvoiceLineItemPayload = Omit<
  InvoiceLineItemRecord,
  'id' | 'invoiceId'
>;

export type InvoiceRecord = {
  id: string;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRecord;
  lineItems: InvoiceLineItemRecord[];
};

export type InvoiceUpsertPayload = {
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItemPayload[];
};

@Injectable({
  providedIn: 'root',
})
export class InvoicesApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly endpoint = `${appSettings.apiBaseUrl}/invoices`;

  listInvoices(type: InvoiceType): Observable<InvoiceRecord[]> {
    const params = new HttpParams().set('type', type);

    return this.httpClient.get<InvoiceRecord[]>(this.endpoint, { params });
  }

  createInvoice(payload: InvoiceUpsertPayload): Observable<InvoiceRecord> {
    return this.httpClient.post<InvoiceRecord>(this.endpoint, payload);
  }

  updateInvoice(
    invoiceId: string,
    payload: Partial<InvoiceUpsertPayload>,
  ): Observable<InvoiceRecord> {
    return this.httpClient.patch<InvoiceRecord>(
      `${this.endpoint}/${invoiceId}`,
      payload,
    );
  }

  deleteInvoice(invoiceId: string): Observable<InvoiceRecord> {
    return this.httpClient.delete<InvoiceRecord>(`${this.endpoint}/${invoiceId}`);
  }
}
