import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  SupplierRecord,
  SuppliersApiService,
  SupplierStatus,
  SupplierUpsertPayload,
} from '../../core/services/suppliers-api.service';
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
    DatePipe,
    FormsModule,
    InputTextModule,
    SelectModule,
    SupplierFormDialogComponent,
    TableModule,
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

  protected statusOptions: StatusOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected searchTerm = '';
  protected statusFilter: SupplierStatus | '' = '';
  protected editingSupplier: SupplierRecord | null = null;

  constructor(private readonly suppliersApiService: SuppliersApiService) {
    this.loadSuppliers();
  }

  protected loadSuppliers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.suppliersApiService
      .listSuppliers(
        this.searchTerm.trim() || undefined,
        this.statusFilter || undefined,
      )
      .subscribe({
        next: (suppliers) => {
          this.suppliers.set(suppliers);
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
    this.editingSupplier = null;
    this.dialogVisible.set(true);
  }

  protected openEditDialog(supplier: SupplierRecord): void {
    this.editingSupplier = supplier;
    this.dialogVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected saveSupplier(payload: SupplierUpsertPayload): void {
    this.saving.set(true);

    const request = this.editingSupplier
      ? this.suppliersApiService.updateSupplier(this.editingSupplier.id, payload)
      : this.suppliersApiService.createSupplier(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.loadSuppliers();
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
}
