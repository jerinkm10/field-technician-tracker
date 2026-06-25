import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { EmployeesApiService } from '../../core/services/employees-api.service';
import { LeadsApiService } from '../../core/services/leads-api.service';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  EmployeeRecord,
  LeadImportPreviewResponse,
  LeadPerformanceResponse,
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
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly leads = signal<LeadRecord[]>([]);
  protected readonly branches = signal<SupplierRecord[]>([]);
  protected readonly employees = signal<EmployeeRecord[]>([]);
  protected readonly productServices = signal<ProductServiceRecord[]>([]);
  protected readonly leadPerformance = signal<LeadPerformanceResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly performanceLoading = signal(false);
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
  protected assignedEmployeeIdFilter = '';
  protected fromDate = '';
  protected toDate = '';
  protected selectedLead: LeadRecord | null = null;
  protected statusLead: LeadRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected selectedImportFile: File | null = null;

  constructor(
    private readonly employeesApiService: EmployeesApiService,
    private readonly leadsApiService: LeadsApiService,
    private readonly suppliersApiService: SuppliersApiService,
    private readonly productServicesApiService: ProductServicesApiService,
  ) {
    this.loadBranches();
    this.loadEmployees();
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
        assignedToEmployeeId: this.assignedEmployeeIdFilter || undefined,
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

    this.loadLeadPerformance();
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
    const isEdit = Boolean(this.selectedLead && this.dialogMode === 'edit');
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
        this.uiFeedback.success(
          isEdit ? 'Lead updated' : 'Lead created',
          `Lead "${payload.leadName}" was saved successfully.`,
        );
      },
      error: (error) => {
        this.saving.set(false);
        const message = this.extractErrorMessage(
          error,
          'Lead save failed. Check the branch, product/service, and follow-up date.',
        );
        this.errorMessage.set(message);
        this.uiFeedback.error('Lead save failed', message);
      },
    });
  }

  protected deleteLead(lead: LeadRecord): void {
    this.uiFeedback.confirm({
      header: 'Delete Lead',
      message: `Delete lead "${lead.leadName}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.leadsApiService.deleteLead(lead.id).subscribe({
          next: () => {
            this.loadLeads();
            this.uiFeedback.success(
              'Lead deleted',
              `Lead "${lead.leadName}" was removed successfully.`,
            );
          },
          error: (error) => {
            const message = this.extractErrorMessage(error, 'Lead delete failed.');
            this.errorMessage.set(message);
            this.uiFeedback.error('Lead delete failed', message);
          },
        });
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
        this.uiFeedback.success(
          'Lead status updated',
          `Lead status changed to ${payload.status.replaceAll('_', ' ')}.`,
        );
      },
      error: (error) => {
        this.saving.set(false);
        const message = this.extractErrorMessage(error, 'Lead status update failed.');
        this.errorMessage.set(message);
        this.uiFeedback.error('Lead status update failed', message);
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
        this.uiFeedback.info(
          'Lead import preview ready',
          `${response.summary.validRows} valid row(s) and ${response.summary.invalidRows} invalid row(s) found.`,
        );
      },
      error: (error) => {
        this.importLoading.set(false);
        this.selectedImportFile = null;
        const message = this.extractErrorMessage(
          error,
          'Lead import preview failed. Verify the Excel file and try again.',
        );
        this.errorMessage.set(message);
        this.uiFeedback.error('Lead import preview failed', message);
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
        this.uiFeedback.success(
          'Leads imported',
          `${response.summary.importedRows} lead row(s) were imported successfully.`,
        );
      },
      error: (error) => {
        this.importLoading.set(false);
        const message = this.extractErrorMessage(error, 'Lead import failed.');
        this.errorMessage.set(message);
        this.uiFeedback.error('Lead import failed', message);
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
        this.uiFeedback.success(
          'Demo Excel downloaded',
          'The lead import demo spreadsheet is ready.',
        );
      },
      error: () => {
        const message = 'Demo Excel download failed.';
        this.errorMessage.set(message);
        this.uiFeedback.error('Demo Excel download failed', message);
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
    this.assignedEmployeeIdFilter = '';
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

  protected employeeFilterOptions(): Option<string>[] {
    return [
      { label: 'All employees', value: '' },
      ...this.employees().map((employee) => ({
        label: `${employee.name} (${employee.username})`,
        value: employee.id,
      })),
    ];
  }

  protected performanceSummaryCards(): Array<{
    label: string;
    value: string;
    note: string;
  }> {
    const summary = this.leadPerformance()?.summary;

    return [
      {
        label: 'Total Leads Assigned',
        value: String(summary?.totalLeadsAssigned ?? 0),
        note: 'Assigned lead records in the current filter scope',
      },
      {
        label: 'Converted Leads',
        value: String(summary?.convertedLeads ?? 0),
        note: 'Leads successfully converted',
      },
      {
        label: 'Lost Leads',
        value: String(summary?.lostLeads ?? 0),
        note: 'Leads marked as lost',
      },
      {
        label: 'Follow-ups Due',
        value: String(summary?.followUpsDue ?? 0),
        note: 'Assigned leads needing action today or earlier',
      },
      {
        label: 'Conversion %',
        value: `${(summary?.conversionPercentage ?? 0).toFixed(2)}%`,
        note: 'Converted leads divided by total assigned leads',
      },
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

  private loadEmployees(): void {
    this.employeesApiService
      .getEmployeesPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.employees.set(
            response.data.filter(
              (employee) =>
                employee.role === 'ADMIN' || employee.role === 'EMPLOYEE',
            ),
          );
        },
        error: () => {
          this.employees.set([]);
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

  private loadLeadPerformance(): void {
    this.performanceLoading.set(true);

    this.leadsApiService
      .getLeadPerformance({
        search: this.searchTerm.trim() || undefined,
        status: this.statusFilter || undefined,
        branchId: this.branchIdFilter || undefined,
        assignedToEmployeeId: this.assignedEmployeeIdFilter || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
      })
      .subscribe({
        next: (response) => {
          this.leadPerformance.set(response);
          this.performanceLoading.set(false);
        },
        error: () => {
          this.leadPerformance.set(null);
          this.performanceLoading.set(false);
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
