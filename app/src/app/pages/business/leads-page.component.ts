import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { LeadFormDialogComponent } from '../../business/components/lead-form-dialog.component';
import { LeadStatusDialogComponent } from '../../business/components/lead-status-dialog.component';
import { LeadsApiService } from '../../core/services/leads-api.service';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  LeadImportPreviewResponse,
  LeadRecord,
  LeadStatus,
  LeadStatusUpdatePayload,
  LeadUpsertPayload,
  ProductServiceRecord,
  SupplierRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-leads-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    DialogModule,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    LeadFormDialogComponent,
    LeadStatusDialogComponent,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './leads-page.component.html',
  styleUrl: './leads-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadsPageComponent {
  protected readonly leads = signal<LeadRecord[]>([]);
  protected readonly branches = signal<SupplierRecord[]>([]);
  protected readonly productServices = signal<ProductServiceRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly statusDialogVisible = signal(false);
  protected readonly importPreviewVisible = signal(false);
  protected readonly importPreview = signal<LeadImportPreviewResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly statusOptions: Option<LeadStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Follow Up', value: 'FOLLOW_UP' },
    { label: 'Demo Scheduled', value: 'DEMO_SCHEDULED' },
    { label: 'Converted', value: 'CONVERTED' },
    { label: 'Lost', value: 'LOST' },
  ];

  protected searchTerm = '';
  protected statusFilter: LeadStatus | '' = '';
  protected branchIdFilter = '';
  protected fromDate = '';
  protected toDate = '';
  protected selectedLead: LeadRecord | null = null;
  protected statusLead: LeadRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected selectedImportFile: File | null = null;

  constructor(
    private readonly leadsApiService: LeadsApiService,
    private readonly suppliersApiService: SuppliersApiService,
    private readonly productServicesApiService: ProductServicesApiService,
  ) {
    this.loadBranches();
    this.loadProductServices();
    this.loadLeads();
  }

  protected loadLeads(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.leadsApiService
      .getLeadsPage({
        search: this.searchTerm.trim() || undefined,
        status: this.statusFilter || undefined,
        branchId: this.branchIdFilter || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.leads.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(
              error,
              'Unable to load leads. Make sure the backend is running and migrated.',
            ),
          );
        },
      });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.selectedLead = null;
    this.dialogVisible.set(true);
  }

  protected openViewDialog(lead: LeadRecord): void {
    this.openDialogForRecord('view', lead.id);
  }

  protected openEditDialog(lead: LeadRecord): void {
    this.openDialogForRecord('edit', lead.id);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedLead = null;
    this.dialogMode = 'create';
  }

  protected saveLead(payload: LeadUpsertPayload): void {
    this.saving.set(true);

    const request =
      this.selectedLead && this.dialogMode === 'edit'
        ? this.leadsApiService.updateLead(this.selectedLead.id, payload)
        : this.leadsApiService.createLead(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadLeads();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(
            error,
            'Lead save failed. Check the branch, product/service, and follow-up date.',
          ),
        );
      },
    });
  }

  protected deleteLead(lead: LeadRecord): void {
    if (!window.confirm(`Delete lead "${lead.leadName}"?`)) {
      return;
    }

    this.leadsApiService.deleteLead(lead.id).subscribe({
      next: () => {
        this.loadLeads();
      },
      error: (error) => {
        this.errorMessage.set(
          this.extractErrorMessage(error, 'Lead delete failed.'),
        );
      },
    });
  }

  protected openStatusDialog(lead: LeadRecord): void {
    this.statusLead = lead;
    this.statusDialogVisible.set(true);
  }

  protected closeStatusDialog(): void {
    this.statusDialogVisible.set(false);
    this.statusLead = null;
  }

  protected saveLeadStatus(payload: LeadStatusUpdatePayload): void {
    if (!this.statusLead) {
      return;
    }

    this.saving.set(true);
    this.leadsApiService.updateLeadStatus(this.statusLead.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeStatusDialog();
        this.loadLeads();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(error, 'Lead status update failed.'),
        );
      },
    });
  }

  protected previewImport(file: File): void {
    this.importLoading.set(true);
    this.errorMessage.set(null);
    this.selectedImportFile = file;

    this.leadsApiService.importLeads(file, false).subscribe({
      next: (response) => {
        this.importLoading.set(false);
        this.importPreview.set(response);
        this.importPreviewVisible.set(true);
      },
      error: (error) => {
        this.importLoading.set(false);
        this.selectedImportFile = null;
        this.errorMessage.set(
          this.extractErrorMessage(
            error,
            'Lead import preview failed. Verify the Excel file and try again.',
          ),
        );
      },
    });
  }

  protected handleImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.previewImport(file);
    input.value = '';
  }

  protected confirmImport(): void {
    if (!this.selectedImportFile) {
      this.errorMessage.set('Select an Excel file before importing leads.');
      return;
    }

    this.importLoading.set(true);

    this.leadsApiService.importLeads(this.selectedImportFile, true).subscribe({
      next: (response) => {
        this.importLoading.set(false);
        this.importPreview.set(response);
        this.loadLeads();
      },
      error: (error) => {
        this.importLoading.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(error, 'Lead import failed.'),
        );
      },
    });
  }

  protected closeImportPreview(): void {
    this.importPreviewVisible.set(false);
    this.importPreview.set(null);
    this.selectedImportFile = null;
  }

  protected downloadDemoExcel(): void {
    this.leadsApiService.downloadDemoExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lead-import-demo.xlsx';
        link.click();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      },
      error: () => {
        this.errorMessage.set('Demo Excel download failed.');
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadLeads();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.branchIdFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.page.set(1);
    this.loadLeads();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadLeads();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadLeads();
  }

  protected statusSeverity(status: LeadStatus): TagSeverity {
    switch (status) {
      case 'NEW':
        return 'info';
      case 'CONTACTED':
      case 'FOLLOW_UP':
        return 'warn';
      case 'DEMO_SCHEDULED':
      case 'CONVERTED':
        return 'success';
      default:
        return 'danger';
    }
  }

  protected branchFilterOptions(): Option<string>[] {
    return [
      { label: 'All branches', value: '' },
      ...this.branches().map((branch) => ({
        label: branch.supplierName,
        value: branch.id,
      })),
    ];
  }

  protected footerLabel(): string {
    return `Showing ${this.leads().length} lead(s) from ${this.totalRecords()} total`;
  }

  private loadBranches(): void {
    this.suppliersApiService
      .getSuppliersPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.branches.set(response.data);
        },
        error: () => {
          this.branches.set([]);
        },
      });
  }

  private loadProductServices(): void {
    this.productServicesApiService
      .getProductServicesPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.productServices.set(response.data);
        },
        error: () => {
          this.productServices.set([]);
        },
      });
  }

  private openDialogForRecord(
    mode: 'edit' | 'view',
    leadId: string,
  ): void {
    this.dialogMode = mode;
    this.loading.set(true);

    this.leadsApiService.getLead(leadId).subscribe({
      next: (lead) => {
        this.selectedLead = lead;
        this.dialogVisible.set(true);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(error, 'Unable to load the selected lead.'),
        );
      },
    });
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      error?: {
        message?: string | string[];
      };
    };
    const message = candidate?.error?.message;

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }
}
