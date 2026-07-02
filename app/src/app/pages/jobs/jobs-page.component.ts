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
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ProductServiceAutocompleteComponent } from '../../business/components/product-service-autocomplete.component';
import { ProductServiceFormDialogComponent } from '../../business/components/product-service-form-dialog.component';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { EmployeesApiService } from '../../core/services/employees-api.service';
import { JobsApiService } from '../../core/services/jobs-api.service';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  CustomerRecord,
  EmployeeRecord,
  JobRecord,
  JobStatus,
  JobUpsertPayload,
  ProductServiceRecord,
  ProductServiceUpsertPayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

type JobDraft = JobUpsertPayload & {
  productServiceName: string;
};

@Component({
  selector: 'app-jobs-page',
  imports: [
    ButtonModule,
    DatePipe,
    DialogModule,
    FormsModule,
    InputTextModule,
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
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly jobs = signal<JobRecord[]>([]);
  protected readonly customers = signal<CustomerRecord[]>([]);
  protected readonly technicians = signal<EmployeeRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly productDialogVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedProductService = signal<ProductServiceRecord | null>(null);

  protected searchTerm = '';
  protected scheduleFilter: 'ALL' | 'TODAY' | 'TOMORROW' | 'FUTURE' = 'ALL';
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected selectedJob: JobRecord | null = null;
  protected draft: JobDraft = this.emptyDraft();

  protected readonly statusOptions: Option<JobStatus>[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Started', value: 'STARTED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  constructor() {
    this.loadJobs();
    this.loadCustomers();
    this.loadTechnicians();
  }

  protected filteredJobs(): JobRecord[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.jobs().filter((job) => {
      const bucket = this.scheduleBucket(job.scheduledDate);
      const matchesBucket =
        this.scheduleFilter === 'ALL' || bucket === this.scheduleFilter;
      const matchesSearch =
        !search ||
        job.jobNumber.toLowerCase().includes(search) ||
        job.title.toLowerCase().includes(search) ||
        job.customer.name.toLowerCase().includes(search) ||
        (job.technician?.user.name.toLowerCase().includes(search) ?? false) ||
        (job.productService?.name.toLowerCase().includes(search) ?? false);

      return matchesBucket && matchesSearch;
    });
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
      technicianId: this.normalizeOptionalString(this.draft.technicianId) ?? null,
      productServiceId:
        this.normalizeOptionalString(this.draft.productServiceId) ?? null,
      scheduledDate: this.draft.scheduledDate,
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
          'Unable to save the job. Verify customer, schedule, and assignment details.',
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

  protected scheduleBucket(scheduledDate: string): 'TODAY' | 'TOMORROW' | 'FUTURE' {
    const jobDate = new Date(scheduledDate);
    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);

    if (this.startOfDay(jobDate).getTime() === today.getTime()) {
      return 'TODAY';
    }

    if (this.startOfDay(jobDate).getTime() === tomorrow.getTime()) {
      return 'TOMORROW';
    }

    return 'FUTURE';
  }

  protected scheduleLabel(scheduledDate: string): string {
    const bucket = this.scheduleBucket(scheduledDate);
    if (bucket === 'TODAY') {
      return 'Today';
    }

    if (bucket === 'TOMORROW') {
      return 'Tomorrow';
    }

    return 'Future';
  }

  protected setScheduleFilter(
    filter: 'ALL' | 'TODAY' | 'TOMORROW' | 'FUTURE',
  ): void {
    this.scheduleFilter = filter;
  }

  protected technicianOptions(): Array<Option<string>> {
    return [
      { label: 'Unassigned technician', value: '' },
      ...this.technicians().map((technician) => ({
        label: `${technician.name} (${technician.username})`,
        value: technician.technicianProfileId ?? '',
      })),
    ];
  }

  protected customerOptions(): Array<Option<string>> {
    return this.customers().map((customer) => ({
      label: customer.customerName,
      value: customer.id,
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

  private loadJobs(): void {
    this.loading.set(true);
    this.jobsApiService.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => {
        this.jobs.set([]);
        this.loading.set(false);
        this.errorMessage.set('Unable to load jobs right now.');
      },
    });
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

  private loadTechnicians(): void {
    this.employeesApiService
      .getEmployeesPage({ role: 'TECHNICIAN', status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.technicians.set(response.data);
        },
        error: () => {
          this.technicians.set([]);
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
      technicianId: job.technician?.id ?? '',
      productServiceId: job.productService?.id ?? '',
      productServiceName: job.productService?.name ?? '',
      scheduledDate: job.scheduledDate.slice(0, 10),
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
      technicianId: '',
      productServiceId: '',
      productServiceName: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
    };
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
