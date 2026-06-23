import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { InvoiceInputFieldsApiService } from '../../core/services/invoice-input-fields-api.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import { InvoiceInputFieldDialogComponent } from '../../invoice/components/invoice-input-field-dialog.component';
import {
  InvoiceInputFieldListFilters,
  InvoiceInputFieldRecord,
  InvoiceInputFieldUpsertPayload,
} from '../../shared/models/billing.models';

type Option = {
  label: string;
  value: string | boolean | '';
};

@Component({
  selector: 'app-invoice-input-fields-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    InvoiceInputFieldDialogComponent,
    SelectModule,
    TagModule,
  ],
  templateUrl: './invoice-input-fields-page.component.html',
  styleUrl: './invoice-input-fields-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceInputFieldsPageComponent {
  protected readonly fields = signal<InvoiceInputFieldRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly sectionOptions: Option[] = [
    { label: 'All sections', value: '' },
    { label: 'Branch', value: 'Supplier' },
    { label: 'Customer', value: 'Customer' },
    { label: 'Line Items', value: 'Line Items' },
    { label: 'Totals', value: 'Totals' },
    { label: 'Invoice Header', value: 'Invoice Header' },
  ];

  protected readonly activeOptions: Option[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  protected searchTerm = '';
  protected sectionFilter = '';
  protected isActiveFilter: boolean | '' = '';
  protected editingField: InvoiceInputFieldRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';

  constructor(
    private readonly invoiceInputFieldsApiService: InvoiceInputFieldsApiService,
  ) {
    this.loadFields();
  }

  protected loadFields(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters: InvoiceInputFieldListFilters = {
      search: this.searchTerm.trim() || undefined,
      section: this.sectionFilter || undefined,
      isActive:
        typeof this.isActiveFilter === 'boolean'
          ? this.isActiveFilter
          : undefined,
      page: this.page(),
      limit: 10,
    };

    this.invoiceInputFieldsApiService.getInvoiceInputFieldsPage(filters).subscribe({
      next: (response) => {
        this.fields.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.hasPreviousPage.set(response.meta.hasPreviousPage);
        this.hasNextPage.set(response.meta.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load invoice input fields. Make sure the backend is running and migrated.',
        );
      },
    });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.editingField = null;
    this.dialogVisible.set(true);
  }

  protected openViewDialog(field: InvoiceInputFieldRecord): void {
    this.dialogMode = 'view';
    this.editingField = field;
    this.dialogVisible.set(true);
  }

  protected openEditDialog(field: InvoiceInputFieldRecord): void {
    this.dialogMode = 'edit';
    this.editingField = field;
    this.dialogVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
  }

  protected saveField(payload: InvoiceInputFieldUpsertPayload): void {
    this.saving.set(true);

    const request = this.editingField
      ? this.invoiceInputFieldsApiService.updateInvoiceInputField(
          this.editingField.id,
          payload,
        )
      : this.invoiceInputFieldsApiService.createInvoiceInputField(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.loadFields();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Invoice input field save failed. Field key must remain unique.',
        );
      },
    });
  }

  protected deleteField(field: InvoiceInputFieldRecord): void {
    if (!window.confirm(`Delete input field "${field.label}"?`)) {
      return;
    }

    this.invoiceInputFieldsApiService.deleteInvoiceInputField(field.id).subscribe({
      next: () => {
        this.loadFields();
      },
      error: () => {
        this.errorMessage.set('Invoice input field delete failed.');
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadFields();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.sectionFilter = '';
    this.isActiveFilter = '';
    this.page.set(1);
    this.loadFields();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadFields();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadFields();
  }

  protected displaySection(section: string): string {
    return section === 'Supplier' ? 'Branch' : section;
  }
}
