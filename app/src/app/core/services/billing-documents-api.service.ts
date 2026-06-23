import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { appSettings } from '../config/app.settings';
import {
  BillingDocumentListFilters,
  BillingDocumentRecord,
  BillingDocumentStatus,
  BillingDocumentUpsertPayload,
  BillingLineItemRecord,
  DocumentKind,
  PaginatedResponse,
  SupplierRecord,
  CustomerRecord,
} from '../../shared/models/billing.models';

type RawInvoiceType = 'PROFORMA' | 'TAX';

type RawBillingLineItem = {
  id: string;
  invoiceId?: string;
  quotationId?: string;
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

type RawCustomerRelation = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gstin: string | null;
  address: string;
  billingAddress: string | null;
  shippingAddress: string | null;
  placeOfSupply: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

type RawInvoiceResponse = {
  id: string;
  invoiceType: RawInvoiceType;
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string | null;
  termsAndConditions: string | null;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue: number;
  status: BillingDocumentStatus;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRecord;
  customer: RawCustomerRelation;
  lineItems: RawBillingLineItem[];
};

type RawQuotationResponse = {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  supplierId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  notes: string | null;
  termsAndConditions: string | null;
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  status: BillingDocumentStatus;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRecord;
  customer: RawCustomerRelation;
  lineItems: RawBillingLineItem[];
};

@Injectable({
  providedIn: 'root',
})
export class BillingDocumentsApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiBaseUrl = appSettings.apiBaseUrl;

  listDocuments(
    kind: DocumentKind,
    filters: BillingDocumentListFilters = {},
  ): Observable<PaginatedResponse<BillingDocumentRecord>> {
    return this.httpClient
      .get<PaginatedResponse<RawInvoiceResponse | RawQuotationResponse>>(
        this.endpointFor(kind),
        {
          params: this.buildParams(filters),
        },
      )
      .pipe(
        map((response) => ({
          ...response,
          data: response.data.map((item) => this.toDocumentRecord(kind, item)),
        })),
      );
  }

  getDocument(kind: DocumentKind, documentId: string): Observable<BillingDocumentRecord> {
    return this.httpClient
      .get<RawInvoiceResponse | RawQuotationResponse>(
        `${this.endpointFor(kind)}/${documentId}`,
      )
      .pipe(map((response) => this.toDocumentRecord(kind, response)));
  }

  createDocument(
    kind: DocumentKind,
    payload: BillingDocumentUpsertPayload,
  ): Observable<BillingDocumentRecord> {
    return this.httpClient
      .post<RawInvoiceResponse | RawQuotationResponse>(
        this.endpointFor(kind),
        this.toApiPayload(kind, payload),
      )
      .pipe(map((response) => this.toDocumentRecord(kind, response)));
  }

  updateDocument(
    kind: DocumentKind,
    documentId: string,
    payload: BillingDocumentUpsertPayload,
  ): Observable<BillingDocumentRecord> {
    return this.httpClient
      .patch<RawInvoiceResponse | RawQuotationResponse>(
        `${this.endpointFor(kind)}/${documentId}`,
        this.toApiPayload(kind, payload),
      )
      .pipe(map((response) => this.toDocumentRecord(kind, response)));
  }

  deleteDocument(kind: DocumentKind, documentId: string): Observable<BillingDocumentRecord> {
    return this.httpClient
      .delete<RawInvoiceResponse | RawQuotationResponse>(
        `${this.endpointFor(kind)}/${documentId}`,
      )
      .pipe(map((response) => this.toDocumentRecord(kind, response)));
  }

  downloadPdf(kind: DocumentKind, documentId: string): Observable<Blob> {
    return this.httpClient.get(`${this.endpointFor(kind)}/${documentId}/pdf`, {
      responseType: 'blob',
    });
  }

  private endpointFor(kind: DocumentKind): string {
    switch (kind) {
      case 'proforma':
        return `${this.apiBaseUrl}/proforma-invoices`;
      case 'tax':
        return `${this.apiBaseUrl}/tax-invoices`;
      default:
        return `${this.apiBaseUrl}/quotations`;
    }
  }

  private buildParams(filters: BillingDocumentListFilters): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        return;
      }

      params = params.set(key, String(value));
    });

    return params;
  }

  private toDocumentRecord(
    kind: DocumentKind,
    response: RawInvoiceResponse | RawQuotationResponse,
  ): BillingDocumentRecord {
    if (kind === 'quotation') {
      const quotation = response as RawQuotationResponse;

      return {
        id: quotation.id,
        kind,
        documentTypeLabel: 'Quotation',
        documentNumber: quotation.quotationNumber,
        documentDate: quotation.quotationDate,
        validUntil: quotation.validUntil,
        supplierId: quotation.supplierId,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerAddress: quotation.customerAddress,
        customerGstin: quotation.customerGstin,
        placeOfSupply: quotation.placeOfSupply,
        notes: quotation.notes,
        termsAndConditions: quotation.termsAndConditions,
        totalBeforeTax: quotation.totalBeforeTax,
        totalTaxAmount: quotation.totalTaxAmount,
        roundedOff: quotation.roundedOff,
        totalAmount: quotation.totalAmount,
        amountDue: quotation.totalAmount,
        status: quotation.status,
        createdAt: quotation.createdAt,
        updatedAt: quotation.updatedAt,
        supplier: quotation.supplier,
        customer: this.toCustomerRecord(quotation.customer),
        lineItems: quotation.lineItems.map((item) =>
          this.toLineItemRecord(quotation.id, item),
        ),
      };
    }

    const invoice = response as RawInvoiceResponse;

    return {
      id: invoice.id,
      kind,
      documentTypeLabel: invoice.invoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice',
      documentNumber: invoice.invoiceNumber,
      documentDate: invoice.invoiceDate,
      validUntil: null,
      supplierId: invoice.supplierId,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      customerGstin: invoice.customerGstin,
      placeOfSupply: invoice.placeOfSupply,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      totalBeforeTax: invoice.totalBeforeTax,
      totalTaxAmount: invoice.totalTaxAmount,
      roundedOff: invoice.roundedOff,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      status: invoice.status,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      supplier: invoice.supplier,
      customer: this.toCustomerRecord(invoice.customer),
      lineItems: invoice.lineItems.map((item) =>
        this.toLineItemRecord(invoice.id, item),
      ),
    };
  }

  private toCustomerRecord(customer: RawCustomerRelation): CustomerRecord {
    return {
      id: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      gstin: customer.gstin,
      billingAddress: customer.billingAddress ?? customer.address,
      shippingAddress:
        customer.shippingAddress ?? customer.billingAddress ?? customer.address,
      placeOfSupply: customer.placeOfSupply,
      address: customer.address,
      latitude: customer.latitude,
      longitude: customer.longitude,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private toLineItemRecord(
    documentId: string,
    item: RawBillingLineItem,
  ): BillingLineItemRecord {
    return {
      id: item.id,
      documentId,
      productServiceName: item.productServiceName,
      description: item.description,
      hsnSac: item.hsnSac,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cgstAmount: item.cgstAmount,
      cgstPercentage: item.cgstPercentage,
      sgstAmount: item.sgstAmount,
      sgstPercentage: item.sgstPercentage,
      lineAmount: item.lineAmount,
    };
  }

  private toApiPayload(kind: DocumentKind, payload: BillingDocumentUpsertPayload) {
    const sharedPayload = {
      supplierId: payload.supplierId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerAddress: payload.customerAddress,
      customerGstin: payload.customerGstin,
      placeOfSupply: payload.placeOfSupply,
      notes: payload.notes?.trim() || undefined,
      termsAndConditions: payload.termsAndConditions?.trim() || undefined,
      totalBeforeTax: payload.totalBeforeTax,
      totalTaxAmount: payload.totalTaxAmount,
      roundedOff: payload.roundedOff,
      totalAmount: payload.totalAmount,
      status: payload.status,
      lineItems: payload.lineItems,
    };

    if (kind === 'quotation') {
      return {
        ...sharedPayload,
        quotationNumber: payload.documentNumber,
        quotationDate: payload.documentDate,
        validUntil: payload.validUntil,
      };
    }

    return {
      ...sharedPayload,
      invoiceType: kind === 'proforma' ? 'PROFORMA' : 'TAX',
      invoiceNumber: payload.documentNumber,
      invoiceDate: payload.documentDate,
      amountDue: payload.amountDue,
    };
  }
}
