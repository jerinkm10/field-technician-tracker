import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { ProductServiceFormDialogComponent } from '../../business/components/product-service-form-dialog.component';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
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
    DecimalPipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    ProductServiceFormDialogComponent,
    SelectModule,
    TagModule,
  ],
  templateUrl: './product-services-page.component.html',
  styleUrl: './product-services-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductServicesPageComponent {
  protected readonly productServices = signal<ProductServiceRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
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

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedProductService = null;
    this.dialogMode = 'create';
  }

  protected saveProductService(payload: ProductServiceUpsertPayload): void {
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
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Product and service save failed. Check the details and try again.',
        );
      },
    });
  }

  protected deleteProductService(productService: ProductServiceRecord): void {
    if (!window.confirm(`Delete "${productService.name}"?`)) {
      return;
    }

    this.productServicesApiService.deleteProductService(productService.id).subscribe({
      next: () => {
        this.loadProductServices();
      },
      error: () => {
        this.errorMessage.set(
          'Product and service delete failed. Try again after refreshing the list.',
        );
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
}
