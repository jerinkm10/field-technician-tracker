import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { RealtimeService } from '../../core/services/realtime.service';

type TagSeverity = 'success' | 'info' | 'warn';

type DashboardMetric = {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly severity: TagSeverity;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [ButtonModule, RouterLink, TagModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  protected readonly realtime = inject(RealtimeService);

  protected readonly metrics: readonly DashboardMetric[] = [
    { label: 'Active Technicians', value: '18', note: 'Across three service zones', severity: 'success' },
    { label: 'Scheduled Jobs', value: '42', note: '11 starting in the next 2 hours', severity: 'info' },
    { label: 'Exceptions', value: '4', note: 'Require dispatch review', severity: 'warn' }
  ];

  protected readonly timeline: readonly string[] = [
    '08:30 - Dispatch released the morning job batch.',
    '09:05 - Two technicians checked in from the south district.',
    '09:40 - One reassignment triggered for delayed arrival.',
    '10:10 - Live tracking socket connected to the admin console.'
  ];

  protected socketSeverity(): TagSeverity {
    return this.realtime.connected() ? 'success' : 'warn';
  }
}
