import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { BillingDocumentsApiService } from '../../core/services/billing-documents-api.service';
import { CompanySettingsApiService } from '../../core/services/company-settings-api.service';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { CustomerAutocompleteComponent } from '../../invoice/components/customer-autocomplete.component';
import { CustomerFormDialogComponent } from '../../invoice/components/customer-form-dialog.component';
import { InvoiceLineItemsComponent } from '../../invoice/components/invoice-line-items.component';
import { InvoicePreviewComponent } from '../../invoice/components/invoice-preview.component';
import { SupplierAutocompleteComponent } from '../../invoice/components/supplier-autocomplete.component';
import { SupplierFormDialogComponent } from '../../invoice/components/supplier-form-dialog.component';
import {
  BillingDocumentRecord,
  BillingDocumentStatus,
  BillingDocumentUpsertPayload,
  BillingLineItemPayload,
  BillingPreviewModel,
  CompanyRecord,
  CustomerRecord,
  CustomerUpsertPayload,
  DocumentKind,
  SupplierRecord,
  SupplierUpsertPayload,
} from '../../shared/models/billing.models';

type StatusOption = {
  label: string;
  value: BillingDocumentStatus;
};

@Component({
  selector: 'app-billing-document-editor-page',
  imports: [
    ButtonModule,
    CustomerAutocompleteComponent,
    CustomerFormDialogComponent,
    DialogModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    InvoiceLineItemsComponent,
    InvoicePreviewComponent,
    SelectModule,
    SupplierAutocompleteComponent,
    SupplierFormDialogComponent,
  ],
  templateUrl: './billing-document-editor-page.component.html',
  styleUrl: './billing-document-editor-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingDocumentEditorPageComponent {
  private readonly uiFeedback = inject(UiFeedbackService);
  private nextNumberRequestId = 0;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly downloading = signal(false);
  protected readonly supplierDialogVisible = signal(false);
  protected readonly customerDialogVisible = signal(false);
  protected readonly previewVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedSupplier = signal<SupplierRecord | null>(null);
  protected readonly selectedCustomer = signal<CustomerRecord | null>(null);
  protected readonly company = signal<CompanyRecord | null>(null);

  protected readonly kind: DocumentKind;
  protected readonly mode: 'create' | 'edit' | 'view';
  protected readonly documentId: string | null;
  protected readonly pageTitle: string;
  protected draft: BillingDocumentUpsertPayload;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly billingDocumentsApiService: BillingDocumentsApiService,
    private readonly companySettingsApiService: CompanySettingsApiService,
    private readonly suppliersApiService: SuppliersApiService,
    private readonly customersApiService: CustomersApiService,
  ) {
    this.kind = (this.route.snapshot.data['kind'] as DocumentKind) ?? 'proforma';
    this.mode = (this.route.snapshot.data['pageMode'] as 'create' | 'edit' | 'view') ?? 'create';
    this.documentId = this.route.snapshot.paramMap.get('id');
    this.pageTitle = this.resolvePageTitle();
    this.draft = this.createEmptyDraft();
    this.loadCompanySettings();

    if (this.documentId) {
      this.loadDocument(this.documentId);
    } else {
      this.loadGeneratedDocumentNumber();
    }
  }

  protected statusOptions(): StatusOption[] {
    if (this.kind === 'quotation') {
      return [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Sent', value: 'SENT' },
        { label: 'Accepted', value: 'ACCEPTED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Expired', value: 'EXPIRED' },
      ];
    }

    return [
      { label: 'Draft', value: 'DRAFT' },
      { label: 'Issued', value: 'ISSUED' },
      { label: 'Paid', value: 'PAID' },
      { label: 'Cancelled', value: 'CANCELLED' },
    ];
  }

  protected isQuotation(): boolean {
    return this.kind === 'quotation';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected applySupplierSelection(supplier: SupplierRecord | null): void {
    this.selectedSupplier.set(supplier);
  }

  protected applyCustomerSelection(customer: CustomerRecord | null): void {
    this.selectedCustomer.set(customer);

    if (!customer) {
      this.draft.customerId = '';
      this.draft.customerName = '';
      this.draft.customerAddress = '';
      this.draft.customerGstin = '';
      this.draft.placeOfSupply = '';
      return;
    }

    this.draft.customerId = customer.id;
    this.draft.customerName = customer.customerName;
    this.draft.customerAddress = customer.billingAddress;
    this.draft.customerGstin = customer.gstin ?? '';
    this.draft.placeOfSupply = customer.placeOfSupply ?? '';
  }

  protected openSupplierDialog(): void {
    this.supplierDialogVisible.set(true);
  }

  protected openCustomerDialog(): void {
    this.customerDialogVisible.set(true);
  }

  protected closeSupplierDialog(): void {
    this.supplierDialogVisible.set(false);
  }

  protected closeCustomerDialog(): void {
    this.customerDialogVisible.set(false);
  }

  protected createSupplier(payload: SupplierUpsertPayload): void {
    this.suppliersApiService.createSupplier(payload).subscribe({
      next: (supplier) => {
        this.selectedSupplier.set(supplier);
        this.draft.supplierId = supplier.id;
        this.supplierDialogVisible.set(false);
        this.uiFeedback.success(
          'Branch created',
          `Branch "${payload.supplierName}" was created and selected.`,
        );
      },
      error: () => {
        const message = 'Branch creation failed. Check the details and try again.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Branch creation failed', message);
      },
    });
  }

  protected createCustomer(payload: CustomerUpsertPayload): void {
    this.customersApiService.createCustomer(payload).subscribe({
      next: (customer) => {
        this.applyCustomerSelection(customer);
        this.customerDialogVisible.set(false);
        this.uiFeedback.success(
          'Customer created',
          `Customer "${payload.customerName}" was created and selected.`,
        );
      },
      error: () => {
        const message = 'Customer creation failed. Check the details and try again.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Customer creation failed', message);
      },
    });
  }

  protected handleLineItemsChange(lineItems: BillingLineItemPayload[]): void {
    this.draft.lineItems = lineItems;
    this.recalculateTotals();
  }

  protected handleRoundedOffChange(): void {
    this.recalculateTotals();
  }

  protected handleDocumentDateChange(): void {
    if (this.documentId) {
      return;
    }

    this.loadGeneratedDocumentNumber();
  }

  protected saveDocument(): void {
    if (this.isReadOnly()) {
      return;
    }

    if (!this.selectedSupplier() || !this.draft.supplierId) {
      this.errorMessage.set('Select a branch before saving.');
      return;
    }

    if (!this.selectedCustomer() || !this.draft.customerId) {
      this.errorMessage.set('Select a customer before saving.');
      return;
    }

    const validLineItems = this.draft.lineItems.filter((item) =>
      Boolean(item.productServiceName.trim()),
    );

    if (!validLineItems.length) {
      this.errorMessage.set('Add at least one line item before saving.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = this.documentId
      ? this.billingDocumentsApiService.updateDocument(this.kind, this.documentId, {
          ...this.draft,
          lineItems: validLineItems,
        })
      : this.billingDocumentsApiService.createDocument(this.kind, {
          ...this.draft,
          lineItems: validLineItems,
        });

    request.subscribe({
      next: (document) => {
        this.saving.set(false);
        this.applyDocument(document);
        this.router.navigate(['/invoice', this.kind, document.id, 'edit']);
        this.uiFeedback.success(
          this.documentId ? 'Document updated' : 'Document created',
          `${document.documentNumber} was saved successfully.`,
        );
      },
      error: () => {
        this.saving.set(false);
        const message =
          'Document save failed. Verify the branch, customer, date, and line item data.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Document save failed', message);
      },
    });
  }

  protected openPreview(): void {
    this.previewVisible.set(true);
  }

  protected closePreview(): void {
    this.previewVisible.set(false);
  }

  protected downloadPdf(): void {
    if (!this.documentId) {
      this.errorMessage.set('Save the document first to enable PDF download.');
      return;
    }

    const filename = this.buildPdfFilename();
    if (!filename) {
      this.errorMessage.set('Document number is required before downloading the PDF.');
      return;
    }

    this.downloading.set(true);

    this.billingDocumentsApiService.downloadPdf(this.kind, this.documentId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        this.uiFeedback.success(
          'PDF downloaded',
          `${filename} is ready.`,
        );
      },
      error: () => {
        this.downloading.set(false);
        const message = 'PDF download failed.';
        this.errorMessage.set(message);
        this.uiFeedback.error('PDF download failed', message);
      },
    });
  }

  protected previewModel(): BillingPreviewModel {
    return {
      company: this.company(),
      documentTypeLabel: this.kind === 'quotation'
        ? 'Quotation'
        : this.kind === 'tax'
          ? 'Tax Invoice'
          : 'Proforma Invoice',
      documentNumber: this.draft.documentNumber,
      documentDate: this.draft.documentDate,
      validUntil: this.draft.validUntil ?? null,
      supplier: this.selectedSupplier(),
      customer: this.selectedCustomer(),
      customerName: this.draft.customerName,
      customerAddress: this.draft.customerAddress,
      customerGstin: this.draft.customerGstin,
      placeOfSupply: this.draft.placeOfSupply,
      lineItems: this.draft.lineItems,
      totalBeforeTax: this.draft.totalBeforeTax,
      totalTaxAmount: this.draft.totalTaxAmount,
      roundedOff: this.draft.roundedOff,
      totalAmount: this.draft.totalAmount,
      amountDue: this.draft.amountDue,
      notes: this.draft.notes ?? '',
      termsAndConditions: this.draft.termsAndConditions ?? '',
      status: this.draft.status,
    };
  }

  protected goBack(): void {
    this.router.navigate(['/invoice', this.kind]);
  }

  protected goToEdit(): void {
    if (!this.documentId) {
      return;
    }

    this.router.navigate(['/invoice', this.kind, this.documentId, 'edit']);
  }

  private loadDocument(documentId: string): void {
    this.loading.set(true);
    this.billingDocumentsApiService.getDocument(this.kind, documentId).subscribe({
      next: (document) => {
        this.applyDocument(document);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Unable to load this document.');
      },
    });
  }

  private loadCompanySettings(): void {
    this.companySettingsApiService.getCompanySettings().subscribe({
      next: (company) => {
        this.company.set(company);

        if (!this.documentId && !this.draft.termsAndConditions?.trim()) {
          this.draft.termsAndConditions = this.resolveDefaultTerms(company);
        }
      },
      error: () => {
        this.company.set(null);
      },
    });
  }

  private loadGeneratedDocumentNumber(): void {
    const requestId = ++this.nextNumberRequestId;

    this.billingDocumentsApiService
      .getNextDocumentNumber(this.kind, this.draft.documentDate)
      .subscribe({
        next: (response) => {
          if (requestId !== this.nextNumberRequestId) {
            return;
          }

          this.draft.documentNumber = response.documentNumber;

          if (
            this.errorMessage() ===
            'Unable to load the next document number right now. The API will still generate it when you save.'
          ) {
            this.errorMessage.set(null);
          }
        },
        error: () => {
          if (!this.draft.documentNumber.trim()) {
            this.errorMessage.set(
              'Unable to load the next document number right now. The API will still generate it when you save.',
            );
          }
        },
      });
  }

  private applyDocument(document: BillingDocumentRecord): void {
    this.selectedSupplier.set(document.supplier);
    this.selectedCustomer.set(document.customer);
    this.draft = {
      documentNumber: document.documentNumber,
      documentDate: document.documentDate.slice(0, 10),
      validUntil: document.validUntil ? document.validUntil.slice(0, 10) : null,
      supplierId: document.supplierId,
      customerId: document.customerId,
      customerName: document.customerName,
      customerAddress: document.customerAddress,
      customerGstin: document.customerGstin,
      placeOfSupply: document.placeOfSupply,
      notes: document.notes ?? '',
      termsAndConditions: document.termsAndConditions ?? '',
      totalBeforeTax: document.totalBeforeTax,
      totalTaxAmount: document.totalTaxAmount,
      roundedOff: document.roundedOff,
      totalAmount: document.totalAmount,
      amountDue: document.amountDue,
      status: document.status,
      lineItems: document.lineItems.map((item) => ({
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
      })),
    };
  }

  private createEmptyDraft(): BillingDocumentUpsertPayload {
    return {
      documentNumber: '',
      documentDate: new Date().toISOString().slice(0, 10),
      validUntil: this.kind === 'quotation' ? new Date().toISOString().slice(0, 10) : null,
      supplierId: '',
      customerId: '',
      customerName: '',
      customerAddress: '',
      customerGstin: '',
      placeOfSupply: '',
      notes: '',
      termsAndConditions: '',
      totalBeforeTax: 0,
      totalTaxAmount: 0,
      roundedOff: 0,
      totalAmount: 0,
      amountDue: 0,
      status: this.kind === 'quotation' ? 'DRAFT' : 'DRAFT',
      lineItems: [
        {
          productServiceName: '',
          description: '',
          hsnSac: '',
          quantity: 1,
          unitPrice: 0,
          cgstAmount: 0,
          cgstPercentage: 9,
          sgstAmount: 0,
          sgstPercentage: 9,
          lineAmount: 0,
        },
      ],
    };
  }

  private resolveDefaultTerms(company: CompanyRecord | null): string {
    if (!company) {
      return '';
    }

    switch (this.kind) {
      case 'tax':
        return company.invoiceTermsAndConditions ?? '';
      case 'quotation':
        return company.quotationTermsAndConditions ?? '';
      default:
        return company.proformaTermsAndConditions ?? '';
    }
  }

  private recalculateTotals(): void {
    const totalBeforeTax = this.roundCurrency(
      this.draft.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      ),
    );
    const totalTaxAmount = this.roundCurrency(
      this.draft.lineItems.reduce(
        (sum, item) => sum + item.cgstAmount + item.sgstAmount,
        0,
      ),
    );
    const totalAmount = this.roundCurrency(
      totalBeforeTax + totalTaxAmount + (this.draft.roundedOff || 0),
    );

    this.draft.totalBeforeTax = totalBeforeTax;
    this.draft.totalTaxAmount = totalTaxAmount;
    this.draft.totalAmount = totalAmount;
    this.draft.amountDue = totalAmount;
  }

  private resolvePageTitle(): string {
    const label = this.kind === 'quotation'
      ? 'Quotation'
      : this.kind === 'tax'
        ? 'Tax Invoice'
        : 'Proforma Invoice';

    switch (this.mode) {
      case 'edit':
        return `Edit ${label}`;
      case 'view':
        return `View ${label}`;
      default:
        return `Create ${label}`;
    }
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private buildPdfFilename(): string | null {
    const documentNumber = this.draft.documentNumber.trim();
    if (!documentNumber) {
      return null;
    }

    const safeDocumentNumber = documentNumber.replace(/[\\/:*?"<>|]+/g, '-');
    return `${safeDocumentNumber}.pdf`;
  }
}
