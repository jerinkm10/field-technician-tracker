import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { CustomersApiService } from '../../core/services/customers-api.service';
import { CustomerFormDialogComponent } from '../../invoice/components/customer-form-dialog.component';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  CustomerListFilters,
  CustomerRecord,
  CustomerStatus,
  CustomerUpsertPayload,
} from '../../shared/models/billing.models';

type StatusOption = {
  label: string;
  value: CustomerStatus | '';
};

type TagSeverity = 'success' | 'warn';

@Component({
  selector: 'app-invoice-customers-page',
  imports: [
    ButtonModule,
    CustomerFormDialogComponent,
    DataTableWithActionsComponent,
    DatePipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './customers-page.component.html',
  styleUrl: './customers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceCustomersPageComponent {
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly statusOptions: StatusOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected searchTerm = '';
  protected statusFilter: CustomerStatus | '' = '';
  protected gstinFilter = '';
  protected phoneFilter = '';
  protected editingCustomer: CustomerRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';

  constructor(private readonly customersApiService: CustomersApiService) {
    this.loadCustomers();
  }

  protected loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters: CustomerListFilters = {
      search: this.searchTerm.trim() || undefined,
      status: this.statusFilter || undefined,
      gstin: this.gstinFilter.trim() || undefined,
      phone: this.phoneFilter.trim() || undefined,
      page: this.page(),
      limit: 10,
    };

    this.customersApiService.getCustomersPage(filters).subscribe({
      next: (response) => {
        this.customers.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.hasPreviousPage.set(response.meta.hasPreviousPage);
        this.hasNextPage.set(response.meta.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load customers. Make sure the backend is running and the latest migrations are applied.',
        );
      },
    });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.editingCustomer = null;
    this.dialogVisible.set(true);
  }

  protected openViewDialog(customer: CustomerRecord): void {
    this.dialogMode = 'view';
    this.editingCustomer = customer;
    this.dialogVisible.set(true);
  }

  protected openEditDialog(customer: CustomerRecord): void {
    this.dialogMode = 'edit';
    this.editingCustomer = customer;
    this.dialogVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected saveCustomer(payload: CustomerUpsertPayload): void {
    this.saving.set(true);

    const request = this.editingCustomer
      ? this.customersApiService.updateCustomer(this.editingCustomer.id, payload)
      : this.customersApiService.createCustomer(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.loadCustomers();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Customer save failed. Verify GSTIN uniqueness and required address fields.',
        );
      },
    });
  }

  protected deleteCustomer(customer: CustomerRecord): void {
    if (!window.confirm(`Delete customer "${customer.customerName}"?`)) {
      return;
    }

    this.customersApiService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.loadCustomers();
      },
      error: () => {
        this.errorMessage.set(
          'Customer delete failed. Customers linked to jobs, invoices, or quotations cannot be removed.',
        );
      },
    });
  }

  protected statusSeverity(status: CustomerStatus): TagSeverity {
    return status === 'ACTIVE' ? 'success' : 'warn';
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadCustomers();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.gstinFilter = '';
    this.phoneFilter = '';
    this.page.set(1);
    this.loadCustomers();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadCustomers();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadCustomers();
  }
}
