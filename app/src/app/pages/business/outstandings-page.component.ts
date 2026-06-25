import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { OutstandingFormDialogComponent } from '../../business/components/outstanding-form-dialog.component';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { OutstandingsApiService } from '../../core/services/outstandings-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  CustomerRecord,
  OutstandingInvoiceType,
  OutstandingRecord,
  OutstandingStatus,
  OutstandingUpdatePayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-outstandings-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    DecimalPipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    OutstandingFormDialogComponent,
    SelectModule,
    TagModule,
  ],
  templateUrl: './outstandings-page.component.html',
  styleUrl: './outstandings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutstandingsPageComponent {
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly outstandings = signal<OutstandingRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly statusOptions: Option<OutstandingStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  protected readonly invoiceTypeOptions: Option<OutstandingInvoiceType>[] = [
    { label: 'All invoice types', value: '' },
    { label: 'Proforma', value: 'PROFORMA' },
    { label: 'Tax', value: 'TAX' },
  ];

  protected searchTerm = '';
  protected fromDate = this.formatDateForInput(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  protected toDate = this.formatDateForInput(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  );
  protected statusFilter: OutstandingStatus | '' = '';
  protected customerIdFilter = '';
  protected invoiceTypeFilter: OutstandingInvoiceType | '' = '';
  protected selectedOutstanding: OutstandingRecord | null = null;
  protected dialogMode: 'edit' | 'view' = 'view';

  constructor(
    private readonly outstandingsApiService: OutstandingsApiService,
    private readonly customersApiService: CustomersApiService,
  ) {
    this.loadCustomers();
    this.loadOutstandings();
  }

  protected loadOutstandings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.outstandingsApiService
      .getOutstandingsPage({
        search: this.searchTerm.trim() || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        status: this.statusFilter || undefined,
        customerId: this.customerIdFilter || undefined,
        invoiceType: this.invoiceTypeFilter || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.outstandings.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load outstanding records. Make sure the backend is running and migrated.',
          );
        },
      });
  }

  protected loadCustomers(): void {
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

  protected openViewDialog(outstanding: OutstandingRecord): void {
    this.dialogMode = 'view';
    this.selectedOutstanding = outstanding;
    this.dialogVisible.set(true);
  }

  protected openEditDialog(outstanding: OutstandingRecord): void {
    this.dialogMode = 'edit';
    this.selectedOutstanding = outstanding;
    this.dialogVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedOutstanding = null;
    this.dialogMode = 'view';
  }

  protected saveOutstanding(payload: OutstandingUpdatePayload): void {
    if (!this.selectedOutstanding) {
      return;
    }

    const invoiceNumber = this.selectedOutstanding.invoiceNumber;
    this.saving.set(true);

    this.outstandingsApiService
      .updateOutstanding(this.selectedOutstanding.id, payload)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeDialog();
          this.loadOutstandings();
          this.uiFeedback.success(
            'Outstanding updated',
            `Outstanding for invoice "${invoiceNumber}" was updated.`,
          );
        },
        error: () => {
          this.saving.set(false);
          const message =
            'Outstanding update failed. Verify the amounts, due date, and note.';
          this.errorMessage.set(message);
          this.uiFeedback.error('Outstanding update failed', message);
        },
      });
  }

  protected deleteOutstanding(outstanding: OutstandingRecord): void {
    this.uiFeedback.confirm({
      header: 'Delete Outstanding',
      message: `Delete outstanding for invoice "${outstanding.invoiceNumber}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.outstandingsApiService.deleteOutstanding(outstanding.id).subscribe({
          next: () => {
            this.loadOutstandings();
            this.uiFeedback.success(
              'Outstanding deleted',
              `Outstanding for "${outstanding.invoiceNumber}" was removed.`,
            );
          },
          error: () => {
            const message =
              'Outstanding delete failed. Try again after refreshing the list.';
            this.errorMessage.set(message);
            this.uiFeedback.error('Outstanding delete failed', message);
          },
        });
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadOutstandings();
  }

  protected resetFilters(): void {
    const today = new Date();
    this.searchTerm = '';
    this.fromDate = this.formatDateForInput(
      new Date(today.getFullYear(), today.getMonth(), 1),
    );
    this.toDate = this.formatDateForInput(
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
    );
    this.statusFilter = '';
    this.customerIdFilter = '';
    this.invoiceTypeFilter = '';
    this.page.set(1);
    this.loadOutstandings();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadOutstandings();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadOutstandings();
  }

  protected statusSeverity(status: OutstandingStatus): TagSeverity {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PARTIAL':
        return 'info';
      case 'OVERDUE':
        return 'danger';
      default:
        return 'warn';
    }
  }

  protected invoiceTypeLabel(invoiceType: OutstandingInvoiceType): string {
    return invoiceType === 'PROFORMA' ? 'Proforma' : 'Tax';
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
