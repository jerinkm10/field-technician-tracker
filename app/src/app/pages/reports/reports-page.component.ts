import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { LiveMapTechnician } from '../../core/services/admin-tracking.service';
import { AdminTrackingService } from '../../core/services/admin-tracking.service';
import {
  ReportJobStatus,
  ReportsApiService,
  TechnicianDailyReportFilters,
  TechnicianDailyReportRow,
} from '../../core/services/reports-api.service';

type TechnicianOption = {
  id: string;
  name: string;
};

type StatusOption = {
  label: string;
  value: ReportJobStatus | '';
};

@Component({
  selector: 'app-reports-page',
  imports: [ButtonModule, DatePipe, DecimalPipe, FormsModule, TableModule, TagModule],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent {
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly rows = signal<TechnicianDailyReportRow[]>([]);
  protected readonly technicians = signal<TechnicianOption[]>([]);

  protected readonly filters = signal<TechnicianDailyReportFilters>({
    technicianId: '',
    date: this.todayDate(),
    status: '',
  });

  protected readonly statusOptions: readonly StatusOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Started', value: 'STARTED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected readonly summaryCards = computed(() => {
    const rows = this.rows();

    return [
      {
        label: 'Technicians',
        value: String(rows.length),
        note: 'Rows in the current report scope',
      },
      {
        label: 'Total Jobs',
        value: String(rows.reduce((total, row) => total + row.totalJobs, 0)),
        note: 'Jobs counted for the selected date',
      },
      {
        label: 'Completed Jobs',
        value: String(rows.reduce((total, row) => total + row.completedJobs, 0)),
        note: 'Completed work inside the current scope',
      },
      {
        label: 'Travel Distance',
        value: `${rows
          .reduce((total, row) => total + row.totalTravelDistance, 0)
          .toFixed(2)} km`,
        note: 'Combined technician movement for the day',
      },
    ];
  });

  constructor(
    private readonly reportsApiService: ReportsApiService,
    private readonly adminTrackingService: AdminTrackingService,
  ) {
    this.loadTechnicians();
    this.fetchReport();
  }

  protected updateFilter<K extends keyof TechnicianDailyReportFilters>(
    key: K,
    value: TechnicianDailyReportFilters[K],
  ): void {
    this.filters.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  protected applyFilters(): void {
    this.fetchReport();
  }

  protected clearFilters(): void {
    this.filters.set({
      technicianId: '',
      date: this.todayDate(),
      status: '',
    });
    this.fetchReport();
  }

  protected exportToExcel(): void {
    const rows = this.rows();
    if (!rows.length) {
      return;
    }

    const headers = [
      'Technician Name',
      'Total Jobs',
      'Completed Jobs',
      'Total Travel Distance (km)',
      'Total Site Time (minutes)',
      'First Location Time',
      'Last Location Time',
    ];

    const bodyRows = rows
      .map((row) =>
        [
          row.technicianName,
          row.totalJobs,
          row.completedJobs,
          row.totalTravelDistance.toFixed(2),
          row.totalSiteTime,
          row.firstLocationTime ? new Date(row.firstLocationTime).toLocaleString() : '',
          row.lastLocationTime ? new Date(row.lastLocationTime).toLocaleString() : '',
        ]
          .map((value) => `<td>${this.escapeHtml(String(value))}</td>`)
          .join(''),
      )
      .map((cells) => `<tr>${cells}</tr>`)
      .join('');

    const documentHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #e2e8f0; font-weight: 700; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${this.escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([`\ufeff${documentHtml}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `technician-daily-report-${this.filters().date || this.todayDate()}.xls`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  protected formatSiteTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!hours) {
      return `${remainingMinutes}m`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  private fetchReport(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.filters();

    this.reportsApiService.getTechnicianDailyReport(filters).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
        this.mergeTechnicianOptions(rows);
      },
      error: () => {
        this.errorMessage.set(
          'Unable to load the technician daily report. Make sure the backend is running and an admin access token is available.',
        );
        this.loading.set(false);
      },
    });
  }

  private loadTechnicians(): void {
    this.adminTrackingService.getLiveMap().subscribe({
      next: (technicians) => {
        this.technicians.set(this.toTechnicianOptions(technicians));
      },
      error: () => {
        this.technicians.set([]);
      },
    });
  }

  private mergeTechnicianOptions(rows: TechnicianDailyReportRow[]): void {
    const known = new Map(this.technicians().map((technician) => [technician.id, technician]));

    rows.forEach((row) => {
      if (!known.has(row.technicianId)) {
        known.set(row.technicianId, {
          id: row.technicianId,
          name: row.technicianName,
        });
      }
    });

    this.technicians.set(
      Array.from(known.values()).sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  private toTechnicianOptions(technicians: LiveMapTechnician[]): TechnicianOption[] {
    return technicians
      .map((technician) => ({
        id: technician.id,
        name: technician.user.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private todayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
