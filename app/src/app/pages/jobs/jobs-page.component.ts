import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ProductServiceAutocompleteComponent } from '../../business/components/product-service-autocomplete.component';
import { ProductServiceFormDialogComponent } from '../../business/components/product-service-form-dialog.component';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { EmployeesApiService } from '../../core/services/employees-api.service';
import { JobsApiService } from '../../core/services/jobs-api.service';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import {
  CustomerRecord,
  EmployeeRecord,
  JobAssignmentRecord,
  JobPriority,
  JobRecord,
  JobStatus,
  JobUpsertPayload,
  ProductServiceRecord,
  ProductServiceUpsertPayload,
  SupplierRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

type JobDraft = Omit<JobUpsertPayload, 'assignedMemberIds'> & {
  assignedMemberIds: string[];
  productServiceName: string;
};

@Component({
  selector: 'app-jobs-page',
  imports: [
    ButtonModule,
    DatePipe,
    DialogModule,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    ProductServiceAutocompleteComponent,
    ProductServiceFormDialogComponent,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './jobs-page.component.html',
  styleUrl: './jobs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsPageComponent {
  private readonly jobsApiService = inject(JobsApiService);
  private readonly customersApiService = inject(CustomersApiService);
  private readonly employeesApiService = inject(EmployeesApiService);
  private readonly productServicesApiService = inject(ProductServicesApiService);
  private readonly suppliersApiService = inject(SuppliersApiService);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly jobs = signal<JobRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly assignableMembers = signal<EmployeeRecord[]>([]);
  protected readonly branches = signal<SupplierRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly productDialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedProductService = signal<ProductServiceRecord | null>(
    null,
  );

  protected searchTerm = '';
  protected fromDate = '';
  protected toDate = '';
  protected statusFilter: JobStatus | '' = '';
  protected priorityFilter: JobPriority | '' = '';
  protected customerIdFilter = '';
  protected assignedUserIdFilter = '';
  protected branchIdFilter = '';
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected selectedJob: JobRecord | null = null;
  protected draft: JobDraft = this.emptyDraft();

  protected readonly statusOptions: Option<JobStatus | ''>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Started', value: 'STARTED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected readonly priorityOptions: Option<JobPriority | ''>[] = [
    { label: 'All priorities', value: '' },
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
  ];

  constructor() {
    this.loadJobs();
    this.loadCustomers();
    this.loadAssignableMembers();
    this.loadBranches();
  }

  protected loadJobs(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.jobsApiService
      .getJobs({
        search: this.searchTerm.trim() || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        status: this.statusFilter || undefined,
        priority: this.priorityFilter || undefined,
        customerId: this.customerIdFilter || undefined,
        assignedUserId: this.assignedUserIdFilter || undefined,
        branchId: this.branchIdFilter || undefined,
      })
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: () => {
          this.jobs.set([]);
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load jobs right now. Make sure the backend is running and migrated.',
          );
        },
      });
  }

  protected applyFilters(): void {
    this.loadJobs();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.customerIdFilter = '';
    this.assignedUserIdFilter = '';
    this.branchIdFilter = '';
    this.loadJobs();
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.selectedJob = null;
    this.selectedProductService.set(null);
    this.draft = this.emptyDraft();
    this.dialogVisible.set(true);
  }

  protected openViewDialog(job: JobRecord): void {
    this.openDialog('view', job);
  }

  protected openEditDialog(job: JobRecord): void {
    this.openDialog('edit', job);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedJob = null;
    this.selectedProductService.set(null);
    this.draft = this.emptyDraft();
  }

  protected saveJob(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    const payload: JobUpsertPayload = {
      jobNumber: this.draft.jobNumber.trim(),
      title: this.draft.title.trim(),
      description: this.draft.description.trim(),
      customerId: this.draft.customerId,
      branchId: this.normalizeOptionalString(this.draft.branchId) ?? null,
      assignedMemberIds: [...this.draft.assignedMemberIds],
      productServiceId:
        this.normalizeOptionalString(this.draft.productServiceId) ?? null,
      scheduledDate: this.draft.scheduledDate,
      priority: this.draft.priority,
      status: this.draft.status,
    };

    const request =
      this.selectedJob && this.dialogMode === 'edit'
        ? this.jobsApiService.updateJob(this.selectedJob.id, payload)
        : this.jobsApiService.createJob(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadJobs();
        this.uiFeedback.success(
          this.selectedJob ? 'Job updated' : 'Job created',
          `Job "${payload.jobNumber}" was saved successfully.`,
        );
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(
          'Unable to save the job. Verify customer, assigned members, and schedule details.',
        );
      },
    });
  }

  protected deleteJob(job: JobRecord): void {
    this.uiFeedback.confirm({
      header: 'Delete Job',
      message: `Delete job "${job.jobNumber}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.jobsApiService.deleteJob(job.id).subscribe({
          next: () => {
            this.loadJobs();
            this.uiFeedback.success('Job deleted', `${job.jobNumber} was removed.`);
          },
          error: () => {
            this.errorMessage.set('Unable to delete the selected job.');
          },
        });
      },
    });
  }

  protected statusSeverity(status: JobStatus): TagSeverity {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'STARTED':
        return 'info';
      case 'CANCELLED':
        return 'danger';
      case 'ASSIGNED':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected scheduleLabel(scheduledDate: string): string {
    const jobDate = this.startOfDay(new Date(scheduledDate));
    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);

    if (jobDate.getTime() === today.getTime()) {
      return 'Today';
    }

    if (jobDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return 'Future';
  }

  protected customerOptions(): Array<Option<string>> {
    return this.customers().map((customer) => ({
      label: customer.customerName,
      value: customer.id,
    }));
  }

  protected memberOptions(): Array<Option<string>> {
    return this.assignableMembers().map((member) => ({
      label: `${member.name} (${member.role.replaceAll('_', ' ')})`,
      value: member.id,
    }));
  }

  protected branchOptions(): Array<Option<string>> {
    return this.branches().map((branch) => ({
      label: branch.supplierName,
      value: branch.id,
    }));
  }

  protected dialogTitle(): string {
    switch (this.dialogMode) {
      case 'edit':
        return 'Edit Job';
      case 'view':
        return 'Job Details';
      default:
        return 'Create Job';
    }
  }

  protected isReadOnly(): boolean {
    return this.dialogMode === 'view';
  }

  protected canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.jobNumber.trim() &&
          this.draft.title.trim() &&
          this.draft.description.trim() &&
          this.draft.customerId &&
          this.draft.scheduledDate,
      )
    );
  }

  protected handleProductServiceSelected(
    productService: ProductServiceRecord | null,
  ): void {
    this.selectedProductService.set(productService);
    this.draft.productServiceId = productService?.id ?? '';
    this.draft.productServiceName = productService?.name ?? '';
  }

  protected handleProductServiceValueChange(value: string): void {
    this.draft.productServiceName = value;
    if (!value) {
      this.selectedProductService.set(null);
      this.draft.productServiceId = '';
    }
  }

  protected openProductDialog(): void {
    this.productDialogVisible.set(true);
  }

  protected closeProductDialog(): void {
    this.productDialogVisible.set(false);
  }

  protected saveProductService(payload: ProductServiceUpsertPayload): void {
    this.productServicesApiService.createProductService(payload).subscribe({
      next: (productService) => {
        this.selectedProductService.set(productService);
        this.draft.productServiceId = productService.id;
        this.draft.productServiceName = productService.name;
        this.productDialogVisible.set(false);
        this.uiFeedback.success(
          'Product/Service created',
          `${productService.name} is ready to use for this job.`,
        );
      },
      error: () => {
        this.errorMessage.set('Unable to create the product/service right now.');
      },
    });
  }

  protected assignedMembersLabel(job: JobRecord): string {
    const assignments = this.sortedAssignments(job);
    if (assignments.length > 0) {
      return assignments
        .map(
          (assignment) =>
            `${assignment.user.name} (${assignment.roleType.replaceAll('_', ' ')})`,
        )
        .join(', ');
    }

    if (job.technician) {
      return `${job.technician.user.name} (Technician)`;
    }

    return 'Unassigned';
  }

  protected memberStatusLabel(assignment: JobAssignmentRecord): string {
    return assignment.status.replaceAll('_', ' ');
  }

  private loadCustomers(): void {
    this.customersApiService
      .getCustomersPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.customers.set(response.data);
        },
        error: () => {
          this.customers.set([]);
        },
      });
  }

  private loadAssignableMembers(): void {
    this.employeesApiService
      .getEmployeesPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.assignableMembers.set(
            response.data.filter(
              (member) =>
                member.role === 'TECHNICIAN' || member.role === 'EMPLOYEE',
            ),
          );
        },
        error: () => {
          this.assignableMembers.set([]);
        },
      });
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

  private openDialog(mode: 'edit' | 'view', job: JobRecord): void {
    this.dialogMode = mode;
    this.selectedJob = job;
    this.selectedProductService.set(job.productService as ProductServiceRecord | null);
    this.draft = {
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      customerId: job.customer.id,
      branchId: job.branch?.id ?? '',
      technicianId: job.technician?.id ?? '',
      assignedMemberIds:
        job.assignments.length > 0
          ? job.assignments.map((assignment) => assignment.userId)
          : job.technician?.user.id
            ? [job.technician.user.id]
            : [],
      productServiceId: job.productService?.id ?? '',
      productServiceName: job.productService?.name ?? '',
      scheduledDate: job.scheduledDate.slice(0, 10),
      priority: job.priority,
      status: job.status,
    };
    this.dialogVisible.set(true);
  }

  private emptyDraft(): JobDraft {
    return {
      jobNumber: `JOB-${new Date().getFullYear()}-${String(this.jobs().length + 1).padStart(3, '0')}`,
      title: '',
      description: '',
      customerId: '',
      branchId: '',
      technicianId: '',
      assignedMemberIds: [],
      productServiceId: '',
      productServiceName: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      priority: 'MEDIUM',
      status: 'PENDING',
    };
  }

  private sortedAssignments(job: JobRecord): JobAssignmentRecord[] {
    return [...job.assignments].sort((left, right) => {
      if (left.roleType !== right.roleType) {
        return left.roleType.localeCompare(right.roleType);
      }

      return left.user.name.localeCompare(right.user.name);
    });
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
