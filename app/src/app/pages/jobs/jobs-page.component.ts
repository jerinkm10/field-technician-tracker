import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

type TagSeverity = 'success' | 'info' | 'warn';

type JobRecord = {
  readonly jobNumber: string;
  readonly customer: string;
  readonly technician: string;
  readonly scheduled: string;
  readonly status: 'Pending' | 'Assigned' | 'Started' | 'Completed';
};

@Component({
  selector: 'app-jobs-page',
  imports: [ButtonModule, TableModule, TagModule],
  templateUrl: './jobs-page.component.html',
  styleUrl: './jobs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsPageComponent {
  protected readonly jobs: JobRecord[] = [
    {
      jobNumber: 'JOB-1001',
      customer: 'Greenline Towers',
      technician: 'Akhil Mathew',
      scheduled: '22 Jun 2026, 11:00 AM',
      status: 'Assigned'
    },
    {
      jobNumber: 'JOB-1002',
      customer: 'Northbay Clinic',
      technician: 'Riya John',
      scheduled: '22 Jun 2026, 12:30 PM',
      status: 'Started'
    },
    {
      jobNumber: 'JOB-1003',
      customer: 'Axis Cold Storage',
      technician: 'Joel Varghese',
      scheduled: '22 Jun 2026, 02:00 PM',
      status: 'Pending'
    }
  ];

  protected statusSeverity(status: JobRecord['status']): TagSeverity {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Started':
        return 'info';
      default:
        return 'warn';
    }
  }
}
