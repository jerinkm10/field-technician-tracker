import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { ProductServiceFormDialogComponent } from '../../business/components/product-service-form-dialog.component';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  ProductServiceHistoryRecord,
  ProductServiceRecord,
  ProductServiceStatus,
  ProductServiceType,
  ProductServiceUpsertPayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'info';

@Component({
  selector: 'app-product-services-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    DecimalPipe,
    DialogModule,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    ProductServiceFormDialogComponent,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './product-services-page.component.html',
  styleUrl: './product-services-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductServicesPageComponent {
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly productServices = signal<ProductServiceRecord[]>([]);
  protected readonly historyRecords = signal<ProductServiceHistoryRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly historyLoading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly historyDialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly typeOptions: Option<ProductServiceType>[] = [
    { label: 'All types', value: '' },
    { label: 'Product', value: 'PRODUCT' },
    { label: 'Service', value: 'SERVICE' },
  ];

  protected readonly statusOptions: Option<ProductServiceStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected searchTerm = '';
  protected typeFilter: ProductServiceType | '' = '';
  protected statusFilter: ProductServiceStatus | '' = '';
  protected hsnSacCodeFilter = '';
  protected selectedProductService: ProductServiceRecord | null = null;
  protected historyProductService: ProductServiceRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';

  constructor(
    private readonly productServicesApiService: ProductServicesApiService,
  ) {
    this.loadProductServices();
  }

  protected loadProductServices(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.productServicesApiService
      .getProductServicesPage({
        search: this.searchTerm.trim() || undefined,
        type: this.typeFilter || undefined,
        status: this.statusFilter || undefined,
        hsnSacCode: this.hsnSacCodeFilter.trim() || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.productServices.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load product and service records. Make sure the backend is running and migrated.',
          );
        },
      });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.selectedProductService = null;
    this.dialogVisible.set(true);
  }

  protected openViewDialog(productService: ProductServiceRecord): void {
    this.openDialogForRecord('view', productService.id);
  }

  protected openEditDialog(productService: ProductServiceRecord): void {
    this.openDialogForRecord('edit', productService.id);
  }

  protected openHistoryDialog(productService: ProductServiceRecord): void {
    this.historyProductService = productService;
    this.historyDialogVisible.set(true);
    this.historyLoading.set(true);

    this.productServicesApiService
      .getProductServiceHistory(productService.id)
      .subscribe({
        next: (history) => {
          this.historyRecords.set(history);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyRecords.set([]);
          this.historyLoading.set(false);
          this.errorMessage.set(
            'Unable to load product and service history. Try again after refreshing the list.',
          );
        },
      });
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedProductService = null;
    this.dialogMode = 'create';
  }

  protected closeHistoryDialog(): void {
    this.historyDialogVisible.set(false);
    this.historyProductService = null;
    this.historyRecords.set([]);
  }

  protected saveProductService(payload: ProductServiceUpsertPayload): void {
    const isEdit = Boolean(
      this.selectedProductService && this.dialogMode === 'edit',
    );
    this.saving.set(true);

    const request = this.selectedProductService && this.dialogMode === 'edit'
      ? this.productServicesApiService.updateProductService(
          this.selectedProductService.id,
          payload,
        )
      : this.productServicesApiService.createProductService(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadProductServices();
        this.uiFeedback.success(
          isEdit ? 'Product or service updated' : 'Product or service created',
          `Record "${payload.name}" was saved successfully.`,
        );
      },
      error: () => {
        this.saving.set(false);
        const message =
          'Product and service save failed. Check the details and try again.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Product and service save failed', message);
      },
    });
  }

  protected deleteProductService(productService: ProductServiceRecord): void {
    this.uiFeedback.confirm({
      header: 'Delete Product or Service',
      message: `Delete "${productService.name}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.productServicesApiService.deleteProductService(productService.id).subscribe({
          next: () => {
            this.loadProductServices();
            this.uiFeedback.success(
              'Product or service deleted',
              `"${productService.name}" was removed successfully.`,
            );
          },
          error: () => {
            const message =
              'Product and service delete failed. Try again after refreshing the list.';
            this.errorMessage.set(message);
            this.uiFeedback.error('Product and service delete failed', message);
          },
        });
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadProductServices();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.hsnSacCodeFilter = '';
    this.page.set(1);
    this.loadProductServices();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadProductServices();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadProductServices();
  }

  protected statusSeverity(status: ProductServiceStatus): TagSeverity {
    return status === 'ACTIVE' ? 'success' : 'warn';
  }

  protected typeSeverity(type: ProductServiceType): TagSeverity {
    return type === 'PRODUCT' ? 'info' : 'warn';
  }

  protected historyActionLabel(action: ProductServiceHistoryRecord['action']): string {
    switch (action) {
      case 'RATE_CHANGE':
        return 'Rate Change';
      case 'TAX_CHANGE':
        return 'Tax Change';
      case 'STATUS_CHANGE':
        return 'Status Change';
      default:
        return action
          .replaceAll('_', ' ')
          .toLowerCase()
          .replace(/\b\w/g, (value) => value.toUpperCase());
    }
  }

  protected historyValueEntries(
    value: Record<string, string | number> | null,
  ): Array<{ label: string; value: string }> {
    if (!value) {
      return [];
    }

    return Object.entries(value).map(([key, itemValue]) => ({
      label: this.fieldLabel(key),
      value: typeof itemValue === 'number' ? itemValue.toString() : itemValue,
    }));
  }

  private openDialogForRecord(
    mode: 'edit' | 'view',
    productServiceId: string,
  ): void {
    this.dialogMode = mode;
    this.loading.set(true);

    this.productServicesApiService.getProductService(productServiceId).subscribe({
      next: (productService) => {
        this.selectedProductService = productService;
        this.dialogVisible.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Unable to load the selected product or service.');
      },
    });
  }

  private fieldLabel(field: string): string {
    switch (field) {
      case 'hsnSacCode':
        return 'HSN / SAC Code';
      case 'defaultRate':
        return 'Default Rate';
      case 'taxPercentage':
        return 'Tax Percentage';
      default:
        return field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (value) => value.toUpperCase());
    }
  }
}
