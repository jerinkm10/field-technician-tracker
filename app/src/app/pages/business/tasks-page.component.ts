import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { DataTableWithActionsComponent } from '../../invoice/components/data-table-with-actions.component';
import { FilterDropdownComponent } from '../../invoice/components/filter-dropdown.component';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeTasksApiService } from '../../core/services/employee-tasks-api.service';
import { EmployeesApiService } from '../../core/services/employees-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import {
  EmployeeRecord,
  EmployeeTaskRecord,
  EmployeeTaskSummaryResponse,
  TaskPriority,
  TaskReferenceType,
  TaskStatus,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T | '';
};

type TagSeverity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

@Component({
  selector: 'app-tasks-page',
  imports: [
    ButtonModule,
    DataTableWithActionsComponent,
    DatePipe,
    FilterDropdownComponent,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPageComponent {
  private readonly tasksApiService = inject(EmployeeTasksApiService);
  private readonly employeesApiService = inject(EmployeesApiService);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly authService = inject(AuthService);
  protected readonly tasks = signal<EmployeeTaskRecord[]>([]);
  protected readonly employees = signal<EmployeeRecord[]>([]);
  protected readonly summary = signal<EmployeeTaskSummaryResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasPreviousPage = signal(false);
  protected readonly hasNextPage = signal(false);
  protected readonly totalRecords = signal(0);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly statusOptions: Option<TaskStatus>[] = [
    { label: 'All statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  protected readonly priorityOptions: Option<TaskPriority>[] = [
    { label: 'All priorities', value: '' },
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
  ];

  protected readonly referenceOptions: Option<TaskReferenceType>[] = [
    { label: 'All modules', value: '' },
    { label: 'Outstanding', value: 'OUTSTANDING' },
    { label: 'Lead', value: 'LEAD' },
    { label: 'Job', value: 'JOB' },
    { label: 'AMC Renewal', value: 'AMC_RENEWAL' },
    { label: 'Complaint', value: 'COMPLAINT' },
  ];

  protected searchTerm = '';
  protected statusFilter: TaskStatus | '' = '';
  protected priorityFilter: TaskPriority | '' = '';
  protected referenceFilter: TaskReferenceType | '' = '';
  protected assignedEmployeeIdFilter = '';
  protected todayOnly = false;

  constructor() {
    this.loadEmployees();
    this.loadSummary();
    this.loadTasks();
  }

  protected loadTasks(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tasksApiService
      .getTasksPage({
        search: this.searchTerm.trim() || undefined,
        status: this.statusFilter || undefined,
        priority: this.priorityFilter || undefined,
        referenceType: this.referenceFilter || undefined,
        assignedEmployeeId:
          this.authService.isAdmin() && this.assignedEmployeeIdFilter
            ? this.assignedEmployeeIdFilter
            : undefined,
        todayOnly: this.todayOnly,
        page: this.page(),
        limit: 10,
      })
      .subscribe({
        next: (response) => {
          this.tasks.set(response.data);
          this.totalRecords.set(response.meta.total);
          this.totalPages.set(response.meta.totalPages);
          this.hasPreviousPage.set(response.meta.hasPreviousPage);
          this.hasNextPage.set(response.meta.hasNextPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.tasks.set([]);
          this.errorMessage.set('Unable to load employee tasks right now.');
        },
      });
  }

  protected loadSummary(): void {
    this.tasksApiService.getTaskSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
      },
      error: () => {
        this.summary.set(null);
      },
    });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.loadTasks();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.referenceFilter = '';
    this.assignedEmployeeIdFilter = '';
    this.todayOnly = false;
    this.page.set(1);
    this.loadTasks();
  }

  protected previousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.page.update((value) => value - 1);
    this.loadTasks();
  }

  protected nextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.page.update((value) => value + 1);
    this.loadTasks();
  }

  protected markTaskInProgress(task: EmployeeTaskRecord): void {
    this.updateTaskStatus(task, 'IN_PROGRESS');
  }

  protected markTaskCompleted(task: EmployeeTaskRecord): void {
    this.updateTaskStatus(task, 'COMPLETED');
  }

  protected statusSeverity(status: TaskStatus): TagSeverity {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'OVERDUE':
        return 'danger';
      case 'IN_PROGRESS':
        return 'info';
      default:
        return 'warn';
    }
  }

  protected prioritySeverity(priority: TaskPriority): TagSeverity {
    switch (priority) {
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected employeeOptions(): Array<Option<string>> {
    return [
      { label: 'All employees', value: '' },
      ...this.employees().map((employee) => ({
        label: `${employee.name} (${employee.username})`,
        value: employee.id,
      })),
    ];
  }

  protected summaryCards(): Array<{ label: string; value: string; note: string }> {
    const summary = this.summary();

    return [
      {
        label: "Today's Tasks",
        value: String(summary?.todayTasks ?? 0),
        note: 'Tasks due in the current working day',
      },
      {
        label: 'Overdue Tasks',
        value: String(summary?.overdueTasks ?? 0),
        note: 'Tasks that need immediate attention',
      },
      {
        label: 'Completed Tasks',
        value: String(summary?.completedTasks ?? 0),
        note: 'Resolved tasks in your synced history',
      },
      {
        label: 'Pending Tasks',
        value: String(summary?.pendingTasks ?? 0),
        note: 'Open tasks across all tracked modules',
      },
    ];
  }

  protected footerLabel(): string {
    return `Showing ${this.tasks().length} task(s) from ${this.totalRecords()} total`;
  }

  private loadEmployees(): void {
    if (!this.authService.isAdmin()) {
      return;
    }

    this.employeesApiService
      .getEmployeesPage({ status: 'ACTIVE', page: 1, limit: 200 })
      .subscribe({
        next: (response) => {
          this.employees.set(response.data);
        },
        error: () => {
          this.employees.set([]);
        },
      });
  }

  private updateTaskStatus(task: EmployeeTaskRecord, status: TaskStatus): void {
    this.tasksApiService.updateTaskStatus(task.id, { status }).subscribe({
      next: () => {
        this.loadSummary();
        this.loadTasks();
        this.uiFeedback.success(
          'Task updated',
          `${task.title} moved to ${status.replaceAll('_', ' ')}.`,
        );
      },
      error: () => {
        this.errorMessage.set('Unable to update the selected task status.');
      },
    });
  }
}
