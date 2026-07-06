import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { CustomerAutocompleteComponent } from '../../invoice/components/customer-autocomplete.component';
import { CustomerFormDialogComponent } from '../../invoice/components/customer-form-dialog.component';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import { AuthService } from '../../core/services/auth.service';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { CustomersApiService } from '../../core/services/customers-api.service';
import { EmployeesApiService } from '../../core/services/employees-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  ComplaintContactPerson,
  ComplaintRecord,
  ComplaintStatus,
  ComplaintUpsertPayload,
  CustomerRecord,
  CustomerUpsertPayload,
  EmployeeRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

type ComplaintDraft = ComplaintUpsertPayload & {
  selectedCustomer: CustomerRecord | null;
};

@Component({
  selector: 'app-complaints-page',
  imports: [
    ButtonModule,
    CustomerAutocompleteComponent,
    CustomerFormDialogComponent,
    DataTableWithActionsComponent,
    DatePipe,
    DialogModule,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './complaints-page.component.html',
  styleUrl: './complaints-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplaintsPageComponent {
  private readonly complaintsApiService = inject(ComplaintsApiService);
  private readonly customersApiService = inject(CustomersApiService);
  private readonly employeesApiService = inject(EmployeesApiService);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly authService = inject(AuthService);
  protected readonly complaints = signal<ComplaintRecord[]>([]);
  protected readonly employees = signal<EmployeeRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly customerDialogVisible = signal(false);
  protected readonly customerDialogSaving = signal(false);
  protected readonly customerDialogSeed = signal<CustomerRecord | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly statusOptions: Option<ComplaintStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Converted To Job', value: 'CONVERTED_TO_JOB' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected readonly contactPersonOptions: Array<Option<ComplaintContactPerson>> = [
    { label: 'Bank Manager', value: 'BANK_MANAGER' },
    { label: 'Assistant Manager', value: 'ASSISTANT_MANAGER' },
    { label: 'Staff', value: 'STAFF' },
    { label: 'Owner', value: 'OWNER' },
    { label: 'Other', value: 'OTHER' },
  ];

  protected readonly formStatusOptions: Array<Option<ComplaintStatus>> = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected searchTerm = '';
  protected statusFilter: ComplaintStatus | '' =
    (this.activatedRoute.snapshot.queryParamMap.get('status') as ComplaintStatus | null) ?? '';
  protected assignedEmployeeIdFilter = '';
  protected fromDate = '';
  protected toDate = '';
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected selectedComplaint: ComplaintRecord | null = null;
  protected draft: ComplaintDraft = this.emptyDraft();

  constructor() {
    this.loadEmployees();
    this.loadComplaints();
  }

  protected loadComplaints(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.complaintsApiService
      .getComplaintsPage({
        search: this.searchTerm.trim() || undefined,
        status: this.statusFilter || undefined,
        assignedEmployeeId: this.assignedEmployeeIdFilter || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.complaints.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.complaints.set([]);
          this.loading.set(false);
          this.errorMessage.set('Unable to load complaint registrations right now.');
        },
      });
  }

  protected openCreateDialog(): void {
    this.dialogMode = 'create';
    this.selectedComplaint = null;
    this.draft = this.emptyDraft();
    this.dialogVisible.set(true);
  }

  protected openViewDialog(complaint: ComplaintRecord): void {
    this.openDialog('view', complaint);
  }

  protected openEditDialog(complaint: ComplaintRecord): void {
    this.openDialog('edit', complaint);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.closeCustomerDialog();
    this.selectedComplaint = null;
    this.draft = this.emptyDraft();
  }

  protected saveComplaint(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    const payload: ComplaintUpsertPayload = {
      customerId: this.draft.selectedCustomer?.id ?? this.draft.customerId ?? null,
      customerName: this.draft.customerName.trim(),
      contactPerson: this.draft.contactPerson,
      phone: this.draft.phone.trim(),
      email: this.normalizeOptionalString(this.draft.email) ?? undefined,
      address: this.draft.address.trim(),
      location: this.draft.location.trim(),
      complaintTitle: this.draft.complaintTitle.trim(),
      complaintDescription: this.draft.complaintDescription.trim(),
      status: this.draft.status,
      assignedEmployeeId: this.canManageAssignments()
        ? this.normalizeOptionalString(this.draft.assignedEmployeeId) ?? null
        : undefined,
      notes: this.normalizeOptionalString(this.draft.notes) ?? undefined,
    };

    const request =
      this.selectedComplaint && this.dialogMode === 'edit'
        ? this.complaintsApiService.updateComplaint(this.selectedComplaint.id, payload)
        : this.complaintsApiService.createComplaint(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadComplaints();
        this.uiFeedback.success(
          this.selectedComplaint ? 'Complaint updated' : 'Complaint created',
          `Complaint "${payload.complaintTitle}" was saved successfully.`,
        );
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Unable to save the complaint registration.');
      },
    });
  }

  protected deleteComplaint(complaint: ComplaintRecord): void {
    this.uiFeedback.confirm({
      header: 'Delete Complaint',
      message: `Delete complaint "${complaint.complaintTitle}"?`,
      acceptLabel: 'Delete',
      accept: () => {
        this.complaintsApiService.deleteComplaint(complaint.id).subscribe({
          next: () => {
            this.loadComplaints();
            this.uiFeedback.success('Complaint deleted', `${complaint.complaintTitle} was removed.`);
          },
          error: () => {
            this.errorMessage.set('Unable to delete the selected complaint.');
          },
        });
      },
    });
  }

  protected convertToCustomer(complaint: ComplaintRecord): void {
    this.complaintsApiService.convertToCustomer(complaint.id).subscribe({
      next: () => {
        this.loadComplaints();
        this.uiFeedback.success('Customer created', `${complaint.customerName} is now linked to a customer record.`);
      },
      error: () => {
        this.errorMessage.set('Unable to convert the complaint into a customer.');
      },
    });
  }

  protected convertToJob(complaint: ComplaintRecord): void {
    this.complaintsApiService.convertToJob(complaint.id).subscribe({
      next: () => {
        this.loadComplaints();
        this.uiFeedback.success('Job created', `${complaint.complaintTitle} was converted into a job.`);
      },
      error: () => {
        this.errorMessage.set('Unable to convert the complaint into a job.');
      },
    });
  }

  protected applySelectedCustomer(customer: CustomerRecord | null): void {
    this.draft.selectedCustomer = customer;
    this.draft.customerId = customer?.id ?? '';

    if (!customer) {
      return;
    }

    this.draft.customerName = customer.customerName;
    this.draft.phone = customer.phone;
    this.draft.email = customer.email ?? '';
    this.draft.address = customer.address;
    this.draft.location = customer.placeOfSupply ?? '';
  }

  protected openCustomerDialog(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.customerDialogSeed.set(this.buildCustomerDialogSeed());
    this.customerDialogVisible.set(true);
  }

  protected closeCustomerDialog(): void {
    this.customerDialogVisible.set(false);
    this.customerDialogSaving.set(false);
    this.customerDialogSeed.set(null);
  }

  protected createCustomer(payload: CustomerUpsertPayload): void {
    this.customerDialogSaving.set(true);

    this.customersApiService.createCustomer(payload).subscribe({
      next: (customer) => {
        this.customerDialogSaving.set(false);
        this.applySelectedCustomer(customer);
        this.closeCustomerDialog();
        this.uiFeedback.success(
          'Customer created',
          `Customer "${customer.customerName}" was created and selected.`,
        );
      },
      error: (error) => {
        this.customerDialogSaving.set(false);
        const message = this.uiFeedback.extractErrorMessage(
          error,
          'Customer creation failed. Check the details and try again.',
        );
        this.errorMessage.set(message);
        this.uiFeedback.error('Customer creation failed', message);
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadComplaints();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.assignedEmployeeIdFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.page.set(1);
    this.loadComplaints();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadComplaints();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadComplaints();
  }

  protected statusSeverity(status: ComplaintStatus): TagSeverity {
    switch (status) {
      case 'PENDING':
        return 'warn';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return 'info';
      case 'CONVERTED_TO_JOB':
      case 'CLOSED':
        return 'success';
      default:
        return 'danger';
    }
  }

  protected employeeOptions(): Array<Option<string>> {
    return [
      { label: 'Unassigned', value: '' },
      ...this.employees().map((employee) => ({
        label: `${employee.name} (${employee.username})`,
        value: employee.id,
      })),
    ];
  }

  protected canManageAssignments(): boolean {
    return this.authService.isAdmin();
  }

  protected canDeleteComplaint(): boolean {
    return this.authService.isAdmin();
  }

  protected footerLabel(): string {
    return `Showing ${this.complaints().length} complaint(s) from ${this.totalRecords()} total`;
  }

  protected dialogTitle(): string {
    switch (this.dialogMode) {
      case 'edit':
        return 'Edit Complaint';
      case 'view':
        return 'Complaint Details';
      default:
        return 'Create Complaint';
    }
  }

  protected isReadOnly(): boolean {
    return this.dialogMode === 'view';
  }

  protected canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.customerName.trim() &&
          this.draft.phone.trim() &&
          this.draft.address.trim() &&
          this.draft.location.trim() &&
          this.draft.complaintTitle.trim() &&
          this.draft.complaintDescription.trim(),
      )
    );
  }

  private loadEmployees(): void {
    this.employeesApiService
      .getEmployeesPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.employees.set(
            response.data.filter(
              (employee) => employee.role === 'ADMIN' || employee.role === 'EMPLOYEE',
            ),
          );
        },
        error: () => {
          this.employees.set([]);
        },
      });
  }

  private openDialog(mode: 'edit' | 'view', complaint: ComplaintRecord): void {
    this.dialogMode = mode;
    this.selectedComplaint = complaint;
    this.draft = {
      customerId: complaint.customerId ?? '',
      selectedCustomer: complaint.customer
        ? {
            id: complaint.customer.id,
            customerName: complaint.customer.name,
            phone: complaint.customer.phone,
            email: complaint.customer.email,
            gstin: null,
            billingAddress: complaint.customer.address,
            shippingAddress: complaint.customer.address,
            placeOfSupply: complaint.location,
            address: complaint.customer.address,
            latitude: null,
            longitude: null,
            status: 'ACTIVE',
            createdAt: complaint.createdAt,
            updatedAt: complaint.updatedAt,
          }
        : null,
      customerName: complaint.customerName,
      contactPerson: complaint.contactPerson,
      phone: complaint.phone,
      email: complaint.email ?? '',
      address: complaint.address,
      location: complaint.location,
      complaintTitle: complaint.complaintTitle,
      complaintDescription: complaint.complaintDescription,
      status: complaint.status,
      assignedEmployeeId: complaint.assignedEmployeeId ?? '',
      notes: complaint.notes ?? '',
    };
    this.dialogVisible.set(true);
  }

  private emptyDraft(): ComplaintDraft {
    return {
      customerId: '',
      selectedCustomer: null,
      customerName: '',
      contactPerson: 'BANK_MANAGER',
      phone: '',
      email: '',
      address: '',
      location: '',
      complaintTitle: '',
      complaintDescription: '',
      status: 'PENDING',
      assignedEmployeeId: '',
      notes: '',
    };
  }

  private buildCustomerDialogSeed(): CustomerRecord | null {
    const customerName = this.draft.customerName.trim();
    const phone = this.draft.phone.trim();
    const email = this.normalizeOptionalString(this.draft.email);
    const address = this.draft.address.trim();
    const placeOfSupply = this.normalizeOptionalString(this.draft.location);

    if (!customerName && !phone && !email && !address && !placeOfSupply) {
      return null;
    }

    const timestamp = new Date().toISOString();

    return {
      id: '',
      customerName,
      phone,
      email,
      gstin: null,
      billingAddress: address,
      shippingAddress: address,
      placeOfSupply,
      address,
      latitude: null,
      longitude: null,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private normalizeOptionalString(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
