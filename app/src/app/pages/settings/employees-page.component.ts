import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { EmployeesApiService } from '../../core/services/employees-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  EmployeeListFilters,
  EmployeeRecord,
  EmployeeRole,
  EmployeeUpsertPayload,
  UserStatus,
} from '../../shared/models/billing.models';
import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import { EmployeeFormDialogComponent } from '../../settings/components/employee-form-dialog.component';

type RoleOption = {
  label: string;
  value: EmployeeRole | '';
};

type StatusOption = {
  label: string;
  value: UserStatus | '';
};

type TagSeverity = 'success' | 'info' | 'warn';

@Component({
  selector: 'app-employees-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    EmployeeFormDialogComponent,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './employees-page.component.html',
  styleUrl: './employees-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesPageComponent {
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly employees = signal<EmployeeRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);

  protected readonly roleOptions: RoleOption[] = [
    { label: 'All roles', value: '' },
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Employee', value: 'EMPLOYEE' },
    { label: 'Technician', value: 'TECHNICIAN' },
  ];

  protected readonly statusOptions: StatusOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected searchTerm = '';
  protected roleFilter: EmployeeRole | '' = '';
  protected statusFilter: UserStatus | '' = '';
  protected editingEmployee: EmployeeRecord | null = null;
  protected dialogMode: 'create' | 'edit' | 'view' = 'create';
  protected readonly pageMode: 'list' | 'create' | 'edit' | 'view';

  constructor(
    private readonly employeesApiService: EmployeesApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.pageMode =
      (this.route.snapshot.data['pageMode'] as
        | 'list'
        | 'create'
        | 'edit'
        | 'view') ?? 'list';
    this.loadEmployees();
    this.handleRouteState();
  }

  protected loadEmployees(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters: EmployeeListFilters = {
      search: this.searchTerm.trim() || undefined,
      role: this.roleFilter || undefined,
      status: this.statusFilter || undefined,
      page: this.page(),
      limit: 10,
    };

    this.employeesApiService.getEmployeesPage(filters).subscribe({
      next: (response) => {
        this.employees.set(response.data);
        this.totalRecords.set(response.meta.total);
        this.totalPages.set(response.meta.totalPages);
        this.hasPreviousPage.set(response.meta.hasPreviousPage);
        this.hasNextPage.set(response.meta.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(
          'Unable to load employees. Make sure the backend is running and the latest migration has been applied.',
        );
      },
    });
  }

  protected openCreateDialog(): void {
    void this.router.navigate(['/settings/employees/create']);
  }

  protected openViewDialog(employee: EmployeeRecord): void {
    void this.router.navigate(['/settings/employees', employee.id, 'view']);
  }

  protected openEditDialog(employee: EmployeeRecord): void {
    void this.router.navigate(['/settings/employees', employee.id, 'edit']);
  }

  protected closeDialog(): void {
    this.dialogVisible.set(false);
    this.editingEmployee = null;
    this.dialogMode = 'create';
    void this.router.navigate(['/settings/employees']);
  }

  protected saveEmployee(payload: EmployeeUpsertPayload): void {
    const isEdit = Boolean(this.editingEmployee);
    this.saving.set(true);

    const request = this.editingEmployee
      ? this.employeesApiService.updateEmployee(this.editingEmployee.id, payload)
      : this.employeesApiService.createEmployee(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.loadEmployees();
        this.closeDialog();
        this.uiFeedback.success(
          isEdit ? 'Employee updated' : 'Employee created',
          `Employee "${payload.name}" was saved successfully.`,
        );
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        const message = this.extractErrorMessage(
          error,
          'Employee save failed. Username, phone number, and email must stay unique.',
        );
        this.errorMessage.set(message);
        this.uiFeedback.error('Employee save failed', message);
      },
    });
  }

  protected roleSeverity(role: EmployeeRole): TagSeverity {
    switch (role) {
      case 'ADMIN':
        return 'info';
      case 'TECHNICIAN':
        return 'success';
      default:
        return 'warn';
    }
  }

  protected statusSeverity(status: UserStatus): TagSeverity {
    return status === 'ACTIVE' ? 'success' : 'warn';
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadEmployees();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.roleFilter = '';
    this.statusFilter = '';
    this.page.set(1);
    this.loadEmployees();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadEmployees();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadEmployees();
  }

  private handleRouteState(): void {
    const employeeId = this.route.snapshot.paramMap.get('id');

    if (this.pageMode === 'create') {
      this.dialogMode = 'create';
      this.editingEmployee = null;
      this.dialogVisible.set(true);
      return;
    }

    if (!employeeId) {
      this.dialogVisible.set(false);
      return;
    }

    this.employeesApiService.getEmployee(employeeId).subscribe({
      next: (employee) => {
        this.editingEmployee = employee;
        this.dialogMode = this.pageMode === 'view' ? 'view' : 'edit';
        this.dialogVisible.set(true);
      },
      error: () => {
        this.errorMessage.set('Unable to load the selected employee.');
        void this.router.navigate(['/settings/employees']);
      },
    });
  }

  private extractErrorMessage(
    error: HttpErrorResponse,
    fallbackMessage: string,
  ): string {
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return fallbackMessage;
  }
}
