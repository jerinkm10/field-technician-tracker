import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { AmcFormDialogComponent } from '../../business/components/amc-form-dialog.component';
import { AmcPreviewDialogComponent } from '../../business/components/amc-preview-dialog.component';
import { AmcApiService } from '../../core/services/amc-api.service';
import { CompanySettingsApiService } from '../../core/services/company-settings-api.service';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  AmcBillingPeriod,
  AmcDashboardSummary,
  AmcRecord,
  AmcStatus,
  AmcUpsertPayload,
  CompanyRecord,
  CustomerRecord,
  SupplierRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-amc-page',
  imports: [
    AmcFormDialogComponent,
    AmcPreviewDialogComponent,
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
  templateUrl: './amc-page.component.html',
  styleUrl: './amc-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmcPageComponent {
  protected readonly amcs = signal<AmcRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly branches = signal<SupplierRecord[]>([]);
  protected readonly company = signal<CompanyRecord | null>(null);
  protected readonly summary = signal<AmcDashboardSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly previewVisible = signal(false);
  protected readonly activeInvoiceAmcId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly statusOptions: Option<AmcStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Expired', value: 'EXPIRED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected readonly billingPeriodOptions: Option<AmcBillingPeriod>[] = [
    { label: 'All billing periods', value: '' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Half yearly', value: 'HALF_YEARLY' },
    { label: 'Yearly', value: 'YEARLY' },
  ];

  protected searchTerm = '';
  protected fromDate = '';
  protected toDate = '';
  protected statusFilter: AmcStatus | '' = '';
  protected customerIdFilter = '';
  protected billingPeriodFilter: AmcBillingPeriod | '' = '';
  protected selectedAmc: AmcRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';

  constructor(
    private readonly amcApiService: AmcApiService,
    private readonly customersApiService: CustomersApiService,
    private readonly suppliersApiService: SuppliersApiService,
    private readonly companySettingsApiService: CompanySettingsApiService,
  ) {
    this.loadCustomers();
    this.loadBranches();
    this.loadCompany();
    this.loadSummary();
    this.loadAmcs();
  }

  protected loadAmcs(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.amcApiService
      .getAmcsPage({
        search: this.searchTerm.trim() || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        status: this.statusFilter || undefined,
        customerId: this.customerIdFilter || undefined,
        billingPeriod: this.billingPeriodFilter || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.amcs.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load AMC contracts. Make sure the backend is running and migrated.',
          );
        },
      });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.selectedAmc = null;
    this.dialogVisible.set(true);
  }

  protected openViewDialog(amc: AmcRecord): void {
    this.openDialogForRecord('view', amc.id);
  }

  protected openEditDialog(amc: AmcRecord): void {
    this.openDialogForRecord('edit', amc.id);
  }

  protected openPreview(amc?: AmcRecord | null): void {
    if (amc) {
      this.selectedAmc = amc;
    }

    if (!this.selectedAmc) {
      return;
    }

    this.previewVisible.set(true);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedAmc = null;
    this.dialogMode = 'create';
  }

  protected closePreview(): void {
    this.previewVisible.set(false);
  }

  protected saveAmc(payload: AmcUpsertPayload): void {
    this.saving.set(true);

    const request =
      this.selectedAmc && this.dialogMode === 'edit'
        ? this.amcApiService.updateAmc(this.selectedAmc.id, payload)
        : this.amcApiService.createAmc(payload);

    request.subscribe({
      next: (amc) => {
        this.saving.set(false);
        this.closeDialog();
        this.selectedAmc = amc;
        this.loadSummary();
        this.loadAmcs();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          error?.error?.message ||
            'AMC save failed. Check the contract number, dates, and billing period.',
        );
      },
    });
  }

  protected deleteAmc(amc: AmcRecord): void {
    if (!window.confirm(`Delete AMC "${amc.amcNumber}"?`)) {
      return;
    }

    this.amcApiService.deleteAmc(amc.id).subscribe({
      next: () => {
        this.loadSummary();
        this.loadAmcs();
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.message ||
            'AMC delete failed. Linked invoice history may need to be removed first.',
        );
      },
    });
  }

  protected createInvoice(amc: AmcRecord): void {
    if (!window.confirm(`Create invoice for AMC "${amc.amcNumber}"?`)) {
      return;
    }

    this.activeInvoiceAmcId.set(amc.id);

    this.amcApiService.createInvoice(amc.id).subscribe({
      next: (response) => {
        this.activeInvoiceAmcId.set(null);
        this.selectedAmc = response.amc;
        this.loadSummary();
        this.loadAmcs();
        window.alert(`Invoice ${response.invoice.invoiceNumber} created successfully.`);
      },
      error: (error) => {
        this.activeInvoiceAmcId.set(null);
        this.errorMessage.set(
          error?.error?.message ||
            'AMC invoice creation failed. Verify the billing cycle and contract dates.',
        );
      },
    });
  }

  protected downloadPdf(amc: AmcRecord): void {
    this.amcApiService.downloadPdf(amc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${amc.amcNumber}.pdf`;
        link.click();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      },
      error: () => {
        this.errorMessage.set('AMC PDF download failed.');
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadAmcs();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.customerIdFilter = '';
    this.billingPeriodFilter = '';
    this.page.set(1);
    this.loadAmcs();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadAmcs();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadAmcs();
  }

  protected statusSeverity(status: AmcStatus): TagSeverity {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'danger';
      default:
        return 'warn';
    }
  }

  protected billingPeriodLabel(period: AmcBillingPeriod): string {
    switch (period) {
      case 'QUARTERLY':
        return 'Quarterly';
      case 'HALF_YEARLY':
        return 'Half yearly';
      default:
        return 'Yearly';
    }
  }

  protected expirySeverity(amc: AmcRecord): TagSeverity | null {
    if (amc.status === 'CANCELLED') {
      return null;
    }

    const daysUntilExpiry = this.daysBetweenToday(amc.endDate);

    if (daysUntilExpiry < 0 || amc.status === 'EXPIRED') {
      return 'danger';
    }

    if (daysUntilExpiry <= 30) {
      return 'warn';
    }

    return null;
  }

  protected expiryLabel(amc: AmcRecord): string | null {
    const daysUntilExpiry = this.daysBetweenToday(amc.endDate);

    if (daysUntilExpiry < 0 || amc.status === 'EXPIRED') {
      return 'Expired';
    }

    if (daysUntilExpiry <= 30) {
      return `Expiring in ${daysUntilExpiry} day(s)`;
    }

    return null;
  }

  protected paymentSeverity(amc: AmcRecord): TagSeverity | null {
    if (!amc.nextBillingDate || amc.status === 'CANCELLED') {
      return null;
    }

    const daysUntilBilling = this.daysBetweenToday(amc.nextBillingDate);

    if (daysUntilBilling < 0) {
      return 'danger';
    }

    if (daysUntilBilling <= 30) {
      return 'warn';
    }

    return null;
  }

  protected paymentLabel(amc: AmcRecord): string | null {
    if (!amc.nextBillingDate || amc.status === 'CANCELLED') {
      return null;
    }

    const daysUntilBilling = this.daysBetweenToday(amc.nextBillingDate);

    if (daysUntilBilling < 0) {
      return `Billing overdue by ${Math.abs(daysUntilBilling)} day(s)`;
    }

    if (daysUntilBilling <= 30) {
      return `Billing due in ${daysUntilBilling} day(s)`;
    }

    return null;
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

  private loadBranches(): void {
    this.suppliersApiService
      .getSuppliersPage({ status: 'ACTIVE', page: 1, limit: 100 })
      .subscribe({
        next: (response) => {
          this.branches.set(response.data);
        },
        error: () => {
          this.branches.set([]);
        },
      });
  }

  private loadCompany(): void {
    this.companySettingsApiService.getCompanySettings().subscribe({
      next: (company) => {
        this.company.set(company);
      },
      error: () => {
        this.company.set(null);
      },
    });
  }

  private loadSummary(): void {
    this.amcApiService.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
      },
      error: () => {
        this.summary.set(null);
      },
    });
  }

  private openDialogForRecord(
    mode: 'edit' | 'view',
    amcId: string,
  ): void {
    this.dialogMode = mode;
    this.loading.set(true);

    this.amcApiService.getAmc(amcId).subscribe({
      next: (amc) => {
        this.selectedAmc = amc;
        this.dialogVisible.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Unable to load the selected AMC record.');
      },
    });
  }

  private daysBetweenToday(value: string): number {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const target = new Date(value);
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const difference = startOfTarget.getTime() - startOfToday.getTime();

    return Math.round(difference / (1000 * 60 * 60 * 24));
  }
}
