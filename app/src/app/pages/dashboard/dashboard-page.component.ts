import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { DashboardApiService } from '../../core/services/dashboard-api.service';
import { RealtimeService } from '../../core/services/realtime.service';
import {
  AmcStatus,
  DashboardAmcPaymentDueAlert,
  DashboardAmcExpiringAlert,
  DashboardBusinessSummaryResponse,
  DashboardLeadFollowUpAlert,
  DashboardOutstandingAlert,
  LeadStatus,
} from '../../shared/models/billing.models';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger';

type DashboardMetric = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly severity: TagSeverity;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [ButtonModule, CurrencyPipe, DatePipe, RouterLink, TagModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  protected readonly realtime = inject(RealtimeService);
  private readonly dashboardApiService = inject(DashboardApiService);
  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
  protected readonly summary = signal<DashboardBusinessSummaryResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly metrics = signal<readonly DashboardMetric[]>([
    {
      label: 'Total Outstanding',
      value: '...',
      note: 'Loading business summary',
      severity: 'info',
    },
    {
      label: 'Overdue Outstanding',
      value: '...',
      note: 'Loading overdue payments',
      severity: 'info',
    },
  ]);

  constructor() {
    this.loadBusinessSummary();
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

  protected loadBusinessSummary(): void {
    this.errorMessage.set(null);

    this.dashboardApiService.getBusinessSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.metrics.set([
          {
            label: 'Total Outstanding',
            value: this.currencyFormatter.format(summary.summary.totalOutstandingAmount),
            note: `${summary.summary.totalOutstandingCount} invoice(s) still open`,
            severity: summary.summary.totalOutstandingCount > 0 ? 'info' : 'success',
          },
          {
            label: 'Overdue Outstanding',
            value: this.currencyFormatter.format(summary.summary.overdueOutstandingAmount),
            note: `${summary.summary.overdueOutstandingCount} payment(s) overdue`,
            severity: summary.summary.overdueOutstandingCount > 0 ? 'danger' : 'success',
          },
          {
            label: 'Active AMC',
            value: String(summary.summary.activeAmcCount),
            note: 'Contracts currently active across customers and branches',
            severity: 'success',
          },
          {
            label: 'AMC Expiring Within 30 Days',
            value: String(summary.summary.amcExpiringWithin30DaysCount),
            note: 'Renewal watchlist requiring near-term attention',
            severity: summary.summary.amcExpiringWithin30DaysCount > 0 ? 'warn' : 'success',
          },
          {
            label: 'Expired AMC',
            value: String(summary.summary.expiredAmcCount),
            note: 'Contracts that need closure or renewal follow-up',
            severity: summary.summary.expiredAmcCount > 0 ? 'danger' : 'success',
          },
          {
            label: 'Leads This Month',
            value: String(summary.summary.leadsThisMonthCount),
            note: 'New leads created in the current calendar month',
            severity: 'info',
          },
          {
            label: 'Follow-ups Due Today',
            value: String(summary.summary.followUpsDueTodayCount),
            note:
              summary.summary.overdueFollowUpsCount > 0
                ? `${summary.summary.overdueFollowUpsCount} follow-up(s) already overdue`
                : 'No overdue lead follow-ups right now',
            severity:
              summary.summary.followUpsDueTodayCount > 0 ||
              summary.summary.overdueFollowUpsCount > 0
                ? 'warn'
                : 'success',
          },
        ]);
      },
      error: () => {
        this.summary.set(null);
        this.errorMessage.set(
          'Business dashboard summary is unavailable. Make sure the backend is running and you are logged in as an admin.',
        );
        this.metrics.set([
          {
            label: 'Business Summary',
            value: '-',
            note: 'Dashboard summary is unavailable until the backend responds',
            severity: 'warn',
          },
        ]);
      },
    });
  }

  protected overdueOutstandingAlerts(): DashboardOutstandingAlert[] {
    return this.summary()?.alerts.overdueOutstanding ?? [];
  }

  protected amcExpiringAlerts(): DashboardAmcExpiringAlert[] {
    return this.summary()?.alerts.amcExpiringWithin30Days ?? [];
  }

  protected amcPaymentDueAlerts(): DashboardAmcPaymentDueAlert[] {
    return this.summary()?.alerts.amcPaymentDue ?? [];
  }

  protected leadFollowUpAlerts(): DashboardLeadFollowUpAlert[] {
    return this.summary()?.alerts.leadsNeedingFollowUp ?? [];
  }
}
