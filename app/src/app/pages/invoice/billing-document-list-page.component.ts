import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { BillingDocumentsApiService } from '../../core/services/billing-documents-api.service';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  BillingDocumentListFilters,
  BillingDocumentRecord,
  BillingDocumentStatus,
  CustomerRecord,
  DocumentKind,
} from '../../shared/models/billing.models';

type StatusOption = {
  label: string;
  value: BillingDocumentStatus | '';
};

type TagSeverity = 'success' | 'warn' | 'info' | 'danger';

@Component({
  selector: 'app-billing-document-list-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    DecimalPipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './billing-document-list-page.component.html',
  styleUrl: './billing-document-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingDocumentListPageComponent {
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly documents = signal<BillingDocumentRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly kind: DocumentKind;
  protected readonly pageTitle: string;
  protected readonly pageSubtitle: string;
  protected readonly tableTitle: string;

  protected searchTerm = '';
  protected statusFilter: BillingDocumentStatus | '' = '';
  protected customerIdFilter = '';
  protected dateFrom = '';
  protected dateTo = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly billingDocumentsApiService: BillingDocumentsApiService,
    private readonly customersApiService: CustomersApiService,
  ) {
    this.kind = (this.route.snapshot.data['kind'] as DocumentKind) ?? 'proforma';
    this.pageTitle = this.kind === 'quotation'
      ? 'Quotation desk'
      : this.kind === 'tax'
        ? 'Tax invoice desk'
        : 'Proforma invoice desk';
    this.pageSubtitle = this.kind === 'quotation'
      ? 'List, filter, and manage quotation records with preview-ready branch and customer billing data.'
      : this.kind === 'tax'
        ? 'List and manage issued tax invoices with backend filters, view/edit routes, and PDF output.'
        : 'List and manage commercial proforma invoices with backend search, filters, preview, and PDF support.';
    this.tableTitle = this.kind === 'quotation' ? 'Quotations' : this.kind === 'tax' ? 'Tax invoices' : 'Proforma invoices';

    this.loadCustomers();
    this.loadDocuments();
  }

  protected statusOptions(): StatusOption[] {
    if (this.kind === 'quotation') {
      return [
        { label: 'All statuses', value: '' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Sent', value: 'SENT' },
        { label: 'Accepted', value: 'ACCEPTED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Expired', value: 'EXPIRED' },
      ];
    }

    return [
      { label: 'All statuses', value: '' },
      { label: 'Draft', value: 'DRAFT' },
      { label: 'Issued', value: 'ISSUED' },
      { label: 'Paid', value: 'PAID' },
      { label: 'Cancelled', value: 'CANCELLED' },
    ];
  }

  protected loadDocuments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters: BillingDocumentListFilters = {
      search: this.searchTerm.trim() || undefined,
      status: this.statusFilter || undefined,
      customerId: this.customerIdFilter || undefined,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      page: this.page(),
      limit: 10,
    };

    this.billingDocumentsApiService.listDocuments(this.kind, filters).subscribe({
      next: (response) => {
        this.documents.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.hasPreviousPage.set(response.meta.hasPreviousPage);
        this.hasNextPage.set(response.meta.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load billing documents. Make sure the backend is running and an admin token is available.',
        );
      },
    });
  }

  protected loadCustomers(): void {
    this.customersApiService
      .getCustomersPage({ status: 'ACTIVE', limit: 100, page: 1 })
      .subscribe({
        next: (response) => {
          this.customers.set(response.data);
        },
        error: () => {
          this.customers.set([]);
        },
      });
  }

  protected createDocument(): void {
    this.router.navigate(['/invoice', this.kind, 'create']);
  }

  protected viewDocument(document: BillingDocumentRecord): void {
    this.router.navigate(['/invoice', this.kind, document.id, 'view']);
  }

  protected editDocument(document: BillingDocumentRecord): void {
    this.router.navigate(['/invoice', this.kind, document.id, 'edit']);
  }

  protected deleteDocument(document: BillingDocumentRecord): void {
    this.uiFeedback.confirm({
      header: `Delete ${document.documentTypeLabel}`,
      message: `Delete ${document.documentTypeLabel.toLowerCase()} "${document.documentNumber}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.billingDocumentsApiService.deleteDocument(this.kind, document.id).subscribe({
          next: () => {
            this.loadDocuments();
            this.uiFeedback.success(
              `${document.documentTypeLabel} deleted`,
              `${document.documentNumber} was removed successfully.`,
            );
          },
          error: () => {
            const message = 'Document delete failed.';
            this.errorMessage.set(message);
            this.uiFeedback.error(
              `Unable to delete ${document.documentTypeLabel.toLowerCase()}`,
              message,
            );
          },
        });
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadDocuments();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.customerIdFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.page.set(1);
    this.loadDocuments();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadDocuments();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadDocuments();
  }

  protected statusSeverity(status: BillingDocumentStatus): TagSeverity {
    switch (status) {
      case 'PAID':
      case 'ACCEPTED':
        return 'success';
      case 'ISSUED':
      case 'SENT':
        return 'info';
      case 'CANCELLED':
      case 'REJECTED':
      case 'EXPIRED':
        return 'danger';
      default:
        return 'warn';
    }
  }
}
