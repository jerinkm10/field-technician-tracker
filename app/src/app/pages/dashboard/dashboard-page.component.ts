import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../core/services/auth.service';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import {
  AmcStatus,
  ComplaintStatus,
  DashboardAmcPaymentDueAlert,
  DashboardAmcExpiringAlert,
  DashboardBusinessSummaryResponse,
  DashboardEmployeeSummaryResponse,
  DashboardLeadFollowUpAlert,
  DashboardOutstandingAlert,
  DashboardPerformanceResponse,
  EmployeeTaskRecord,
  LeadStatus,
  TaskStatus,
} from '../../shared/models/billing.models';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

type DashboardMetric = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly severity: TagSeverity;
  readonly route?: string;
  readonly queryParams?: Readonly<Record<string, string>>;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [ButtonModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink, TagModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  protected readonly realtime = inject(RealtimeService);
  protected readonly authService = inject(AuthService);
  private readonly dashboardApiService = inject(DashboardApiService);
  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  protected readonly businessSummary = signal<DashboardBusinessSummaryResponse | null>(null);
  protected readonly employeeSummary = signal<DashboardEmployeeSummaryResponse | null>(null);
  protected readonly performance = signal<DashboardPerformanceResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly metrics = computed(() => {
    return this.authService.isAdmin()
      ? this.buildAdminMetrics()
      : this.buildEmployeeMetrics();
  });

  constructor() {
    this.loadDashboard();
  }

  protected isAdminView(): boolean {
    return this.authService.isAdmin();
  }

  protected socketSeverity(): TagSeverity {
    return this.realtime.connected() ? 'success' : 'warn';
  }

  protected amcStatusSeverity(status: AmcStatus): TagSeverity {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'danger';
      default:
        return 'warn';
    }
  }

  protected leadStatusSeverity(status: LeadStatus): TagSeverity {
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

  protected complaintStatusSeverity(status: ComplaintStatus): TagSeverity {
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

  protected taskStatusSeverity(status: TaskStatus): TagSeverity {
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

  protected overdueBadgeSeverity(daysOverdue: number): TagSeverity {
    return daysOverdue >= 7 ? 'danger' : 'warn';
  }

  protected followUpBadgeLabel(item: DashboardLeadFollowUpAlert): string {
    if (item.daysUntilFollowUp === null) {
      return 'Follow-up pending';
    }

    if (item.daysUntilFollowUp < 0) {
      return `${Math.abs(item.daysUntilFollowUp)} day(s) overdue`;
    }

    if (item.daysUntilFollowUp === 0) {
      return 'Due today';
    }

    return `Due in ${item.daysUntilFollowUp} day(s)`;
  }

  protected amcBillingBadgeLabel(item: DashboardAmcPaymentDueAlert): string {
    if (item.daysUntilBilling === null) {
      return 'Billing date pending';
    }

    if (item.daysUntilBilling < 0) {
      return `${Math.abs(item.daysUntilBilling)} day(s) overdue`;
    }

    if (item.daysUntilBilling === 0) {
      return 'Due today';
    }

    return `Due in ${item.daysUntilBilling} day(s)`;
  }

  protected amcExpiryBadgeLabel(item: DashboardAmcExpiringAlert): string {
    if (item.daysUntilExpiry <= 0) {
      return 'Expires today';
    }

    return `${item.daysUntilExpiry} day(s) left`;
  }

  protected taskLabel(task: EmployeeTaskRecord): string {
    return task.customer ? `${task.title} | ${task.customer.name}` : task.title;
  }

  protected chartWidth(value: number, maxValue: number): string {
    if (maxValue <= 0) {
      return '0%';
    }

    return `${Math.max(8, Math.round((value / maxValue) * 100))}%`;
  }

  protected maxChartValue(values: Array<{ value: number }>): number {
    return values.reduce((max, item) => Math.max(max, item.value), 0);
  }

  protected adminPendingComplaints() {
    return this.businessSummary()?.alerts.pendingComplaints ?? [];
  }

  protected adminOverdueOutstandingAlerts(): DashboardOutstandingAlert[] {
    return this.businessSummary()?.alerts.overdueOutstanding ?? [];
  }

  protected adminAmcExpiringAlerts(): DashboardAmcExpiringAlert[] {
    return this.businessSummary()?.alerts.amcExpiringWithin30Days ?? [];
  }

  protected adminAmcPaymentDueAlerts(): DashboardAmcPaymentDueAlert[] {
    return this.businessSummary()?.alerts.amcPaymentDue ?? [];
  }

  protected adminLeadFollowUpAlerts(): DashboardLeadFollowUpAlert[] {
    return this.businessSummary()?.alerts.leadsNeedingFollowUp ?? [];
  }

  private loadDashboard(): void {
    this.errorMessage.set(null);

    if (this.authService.isAdmin()) {
      this.loadAdminDashboard();
      return;
    }

    this.loadEmployeeDashboard();
  }

  private loadAdminDashboard(): void {
    this.dashboardApiService.getBusinessSummary().subscribe({
      next: (summary) => {
        this.businessSummary.set(summary);
      },
      error: () => {
        this.businessSummary.set(null);
        this.errorMessage.set(
          'Business dashboard summary is unavailable. Make sure the backend is running and migrated.',
        );
      },
    });

    this.dashboardApiService.getPerformance().subscribe({
      next: (performance) => {
        this.performance.set(performance);
      },
      error: () => {
        this.performance.set(null);
      },
    });
  }

  private loadEmployeeDashboard(): void {
    this.dashboardApiService.getEmployeeSummary().subscribe({
      next: (summary) => {
        this.employeeSummary.set(summary);
      },
      error: () => {
        this.employeeSummary.set(null);
        this.errorMessage.set(
          'Employee dashboard summary is unavailable. Make sure the backend is running and migrated.',
        );
      },
    });
  }

  private buildAdminMetrics(): readonly DashboardMetric[] {
    const summary = this.businessSummary()?.summary;
    if (!summary) {
      return [
        {
          label: 'Business Summary',
          value: '...',
          note: 'Loading dashboard metrics',
          severity: 'info',
        },
      ];
    }

    const trackedEmployees =
      this.performance()?.employees.length ??
      this.businessSummary()?.topEmployees.length ??
      0;
    const topPerformer =
      this.performance()?.employees[0]?.employeeName ??
      this.businessSummary()?.topEmployees[0]?.employeeName ??
      'Loading';

    return [
      {
        label: 'Pending Complaints',
        value: String(summary.pendingComplaintsCount),
        note: `${summary.pendingComplaintsAssignedCount} complaint(s) already assigned`,
        severity: summary.pendingComplaintsCount > 0 ? 'warn' : 'success',
        route: '/business/complaints',
        queryParams: { status: 'PENDING' },
      },
      {
        label: 'Outstanding Amount',
        value: this.currencyFormatter.format(summary.totalOutstandingAmount),
        note: `${summary.totalOutstandingCount} invoice(s) remain open`,
        severity: summary.totalOutstandingCount > 0 ? 'info' : 'success',
        route: '/business/outstanding',
      },
      {
        label: "Today's Jobs",
        value: String(summary.todayJobsCount),
        note: 'Scheduled jobs visible to the field team today',
        severity: summary.todayJobsCount > 0 ? 'info' : 'secondary',
        route: '/jobs',
      },
      {
        label: 'AMC Expiring',
        value: String(summary.amcExpiringWithin30DaysCount),
        note: `${summary.overdueAmcPaymentCount} AMC payment(s) already overdue`,
        severity: summary.amcExpiringWithin30DaysCount > 0 ? 'warn' : 'success',
        route: '/business/amc',
      },
      {
        label: 'Lead Conversion',
        value: `${summary.leadConversionPercentage.toFixed(2)}%`,
        note: `${summary.leadsConvertedThisMonthCount}/${summary.leadsThisMonthCount} leads converted this month`,
        severity: summary.leadConversionPercentage > 0 ? 'success' : 'secondary',
        route: '/business/lead',
      },
      {
        label: 'Employee Performance',
        value: String(trackedEmployees),
        note: trackedEmployees > 0 ? `Top performer: ${topPerformer}` : 'Loading employee analytics',
        severity: trackedEmployees > 0 ? 'info' : 'secondary',
      },
      {
        label: 'Technician Availability',
        value: `${summary.technicianAvailability.available} Available`,
        note: `${summary.technicianAvailability.onJob} on job | ${summary.technicianAvailability.offline} offline`,
        severity: summary.technicianAvailability.available > 0 ? 'success' : 'warn',
      },
      {
        label: 'Complaints Assigned',
        value: String(summary.pendingComplaintsAssignedCount),
        note: 'Open complaints already owned by employees',
        severity: summary.pendingComplaintsAssignedCount > 0 ? 'warn' : 'success',
        route: '/business/complaints',
      },
    ];
  }

  private buildEmployeeMetrics(): readonly DashboardMetric[] {
    const summary = this.employeeSummary()?.summary;
    if (!summary) {
      return [
        {
          label: 'Employee Summary',
          value: '...',
          note: 'Loading assigned work summary',
          severity: 'info',
        },
      ];
    }

    return [
      {
        label: "Today's Tasks",
        value: String(summary.todayTasks),
        note: `${summary.overdueTasks} overdue task(s) need attention`,
        severity: summary.todayTasks > 0 || summary.overdueTasks > 0 ? 'warn' : 'success',
        route: '/business/tasks',
      },
      {
        label: "Today's Follow-ups",
        value: String(summary.todayFollowUps),
        note: `${summary.assignedLeads} assigned leads are in your queue`,
        severity: summary.todayFollowUps > 0 ? 'info' : 'secondary',
        route: '/business/lead',
      },
      {
        label: 'Outstanding Collection',
        value: String(summary.outstandingCollectionTasks),
        note: 'Collection follow-up tasks synced from receivables',
        severity: summary.outstandingCollectionTasks > 0 ? 'warn' : 'success',
        route: '/business/outstanding',
      },
      {
        label: 'Assigned Leads',
        value: String(summary.assignedLeads),
        note: 'Active sales follow-ups assigned to you',
        severity: summary.assignedLeads > 0 ? 'info' : 'secondary',
        route: '/business/lead',
      },
      {
        label: 'Pending Complaints',
        value: String(summary.pendingComplaintsAssigned),
        note: `${summary.completedTasks} completed task(s) in your history`,
        severity: summary.pendingComplaintsAssigned > 0 ? 'warn' : 'success',
        route: '/business/complaints',
      },
    ];
  }
}
