import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { LedgerDetailDialogComponent } from '../../business/components/ledger-detail-dialog.component';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { LedgerApiService } from '../../core/services/ledger-api.service';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  CustomerRecord,
  LedgerDocumentType,
  LedgerRecord,
  ProductServiceRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-ledger-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    DecimalPipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    LedgerDetailDialogComponent,
    SelectModule,
    TagModule,
  ],
  templateUrl: './ledger-page.component.html',
  styleUrl: './ledger-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerPageComponent {
  protected readonly ledgerEntries = signal<LedgerRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly productServices = signal<ProductServiceRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly selectedLedgerEntry = signal<LedgerRecord | null>(null);

  protected readonly documentTypeOptions: Option<LedgerDocumentType>[] = [
    { label: 'All document types', value: '' },
    { label: 'Proforma Invoice', value: 'PROFORMA_INVOICE' },
    { label: 'Tax Invoice', value: 'TAX_INVOICE' },
    { label: 'AMC Invoice', value: 'AMC_INVOICE' },
    { label: 'Quotation', value: 'QUOTATION' },
    { label: 'Outstanding', value: 'OUTSTANDING' },
  ];

  protected readonly statusOptions: Option<string>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Issued', value: 'ISSUED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Expired', value: 'EXPIRED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  protected searchTerm = '';
  protected fromDate = '';
  protected toDate = '';
  protected customerIdFilter = '';
  protected documentTypeFilter: LedgerDocumentType | '' = '';
  protected statusFilter = '';
  protected productServiceIdFilter = '';
  protected hsnSacCodeFilter = '';

  constructor(
    private readonly ledgerApiService: LedgerApiService,
    private readonly customersApiService: CustomersApiService,
    private readonly productServicesApiService: ProductServicesApiService,
  ) {
    this.loadCustomers();
    this.loadProductServices();
    this.loadLedgerEntries();
  }

  protected loadLedgerEntries(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ledgerApiService
      .getLedgerPage({
        search: this.searchTerm.trim() || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        customerId: this.customerIdFilter || undefined,
        documentType: this.documentTypeFilter || undefined,
        status: this.statusFilter || undefined,
        productServiceId: this.productServiceIdFilter || undefined,
        hsnSacCode: this.hsnSacCodeFilter.trim() || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.ledgerEntries.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load ledger records. Make sure the backend is running and migrated.',
          );
        },
      });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadLedgerEntries();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.customerIdFilter = '';
    this.documentTypeFilter = '';
    this.statusFilter = '';
    this.productServiceIdFilter = '';
    this.hsnSacCodeFilter = '';
    this.page.set(1);
    this.loadLedgerEntries();
  }

  protected openViewDialog(ledgerEntry: LedgerRecord): void {
    this.detailLoading.set(true);

    this.ledgerApiService.getLedgerEntry(ledgerEntry.id).subscribe({
      next: (entry) => {
        this.selectedLedgerEntry.set(entry);
        this.dialogVisible.set(true);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.errorMessage.set('Unable to load the selected ledger entry.');
      },
    });
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedLedgerEntry.set(null);
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadLedgerEntries();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadLedgerEntries();
  }

  protected documentTypeLabel(documentType: LedgerDocumentType): string {
    switch (documentType) {
      case 'PROFORMA_INVOICE':
        return 'Proforma Invoice';
      case 'TAX_INVOICE':
        return 'Tax Invoice';
      case 'AMC_INVOICE':
        return 'AMC Invoice';
      case 'OUTSTANDING':
        return 'Outstanding';
      default:
        return 'Quotation';
    }
  }

  protected statusSeverity(status: string): TagSeverity {
    switch (status) {
      case 'PAID':
      case 'ISSUED':
      case 'ACTIVE':
      case 'ACCEPTED':
        return 'success';
      case 'OVERDUE':
      case 'CANCELLED':
      case 'REJECTED':
      case 'EXPIRED':
        return 'danger';
      case 'PARTIAL':
      case 'PENDING':
      case 'DRAFT':
      case 'SENT':
        return 'warn';
      default:
        return 'info';
    }
  }

  private loadCustomers(): void {
    this.customersApiService
      .getCustomersPage({ status: 'ACTIVE', page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          this.customers.set(response.data);
        },
        error: () => {
          this.customers.set([]);
        },
      });
  }

  private loadProductServices(): void {
    this.productServicesApiService
      .getProductServicesPage({ status: 'ACTIVE', page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          this.productServices.set(response.data);
        },
        error: () => {
          this.productServices.set([]);
        },
      });
  }
}
