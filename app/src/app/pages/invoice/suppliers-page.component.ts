import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import {
  SupplierListFilters,
  SupplierRecord,
  SupplierStatus,
  SupplierUpsertPayload,
} from '../../shared/models/billing.models';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import { SupplierFormDialogComponent } from '../../invoice/components/supplier-form-dialog.component';

type StatusOption = {
  label: string;
  value: SupplierStatus | '';
};

type TagSeverity = 'success' | 'warn';

@Component({
  selector: 'app-invoice-suppliers-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    SupplierFormDialogComponent,
    TagModule,
  ],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceSuppliersPageComponent {
  protected readonly suppliers = signal<SupplierRecord[]>([]);
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
  protected statusFilter: SupplierStatus | '' = '';
  protected gstinFilter = '';
  protected phoneFilter = '';
  protected editingSupplier: SupplierRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected readonly pageMode: 'list' | 'create' | 'edit' | 'view';

  constructor(
    private readonly suppliersApiService: SuppliersApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.pageMode =
      (this.route.snapshot.data['pageMode'] as
        | 'list'
        | 'create'
        | 'edit'
        | 'view') ?? 'list';
    this.loadSuppliers();
    this.handleRouteState();
  }

  protected loadSuppliers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters: SupplierListFilters = {
      search: this.searchTerm.trim() || undefined,
      status: this.statusFilter || undefined,
      gstin: this.gstinFilter.trim() || undefined,
      phone: this.phoneFilter.trim() || undefined,
      page: this.page(),
      limit: 10,
    };

    this.suppliersApiService.getSuppliersPage(filters).subscribe({
      next: (response) => {
        this.suppliers.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.hasPreviousPage.set(response.meta.hasPreviousPage);
        this.hasNextPage.set(response.meta.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load suppliers. Make sure the backend is running and the database is migrated.',
        );
      },
    });
  }

  protected openCreateDialog(): void {
    void this.router.navigate(['/settings/suppliers/create']);
  }

  protected openViewDialog(supplier: SupplierRecord): void {
    void this.router.navigate(['/settings/suppliers', supplier.id, 'view']);
  }

  protected openEditDialog(supplier: SupplierRecord): void {
    void this.router.navigate(['/settings/suppliers', supplier.id, 'edit']);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.editingSupplier = null;
    this.dialogMode = 'create';
    void this.router.navigate(['/settings/suppliers']);
  }

  protected saveSupplier(payload: SupplierUpsertPayload): void {
    this.saving.set(true);

    const request = this.editingSupplier
      ? this.suppliersApiService.updateSupplier(this.editingSupplier.id, payload)
      : this.suppliersApiService.createSupplier(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.loadSuppliers();
        this.closeDialog();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Supplier save failed. GSTIN must be unique and all fields are required.',
        );
      },
    });
  }

  protected deleteSupplier(supplier: SupplierRecord): void {
    if (!window.confirm(`Delete supplier "${supplier.supplierName}"?`)) {
      return;
    }

    this.suppliersApiService.deleteSupplier(supplier.id).subscribe({
      next: () => {
        this.loadSuppliers();
      },
      error: () => {
        this.errorMessage.set(
          'Supplier delete failed. Suppliers linked to invoices must stay in the master list.',
        );
      },
    });
  }

  protected statusSeverity(status: SupplierStatus): TagSeverity {
    return status === 'ACTIVE' ? 'success' : 'warn';
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadSuppliers();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.gstinFilter = '';
    this.phoneFilter = '';
    this.page.set(1);
    this.loadSuppliers();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadSuppliers();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadSuppliers();
  }

  private handleRouteState(): void {
    const supplierId = this.route.snapshot.paramMap.get('id');

    if (this.pageMode === 'create') {
      this.dialogMode = 'create';
      this.editingSupplier = null;
      this.dialogVisible.set(true);
      return;
    }

    if (!supplierId) {
      this.dialogVisible.set(false);
      return;
    }

    this.suppliersApiService.getSupplier(supplierId).subscribe({
      next: (supplier) => {
        this.editingSupplier = supplier;
        this.dialogMode = this.pageMode === 'view' ? 'view' : 'edit';
        this.dialogVisible.set(true);
      },
      error: () => {
        this.errorMessage.set('Unable to load the selected supplier.');
        void this.router.navigate(['/settings/suppliers']);
      },
    });
  }
}
