import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { EmployeesApiService } from '../../core/services/employees-api.service';
import { EmployeeRecord } from '../../shared/models/billing.models';

type TagSeverity = 'success' | 'info' | 'warn' | 'secondary';

type TechnicianMetric = {
  label: string;
  value: string;
  note: string;
};

@Component({
  selector: 'app-technicians-page',
  imports: [ButtonModule, TagModule],
  templateUrl: './technicians-page.component.html',
  styleUrl: './technicians-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniciansPageComponent {
  private readonly employeesApiService = inject(EmployeesApiService);

  protected readonly technicians = signal<EmployeeRecord[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly metrics = computed<TechnicianMetric[]>(() => {
    const technicians = this.technicians();

    return [
      {
        label: 'Roster Size',
        value: String(technicians.length),
        note: 'Technician accounts currently visible in the admin roster',
      },
      {
        label: 'Available',
        value: String(
          technicians.filter((technician) => technician.technicianStatus === 'AVAILABLE')
            .length,
        ),
        note: 'Ready for the next dispatch assignment',
      },
      {
        label: 'On Job',
        value: String(
          technicians.filter((technician) => technician.technicianStatus === 'ON_JOB')
            .length,
        ),
        note: 'Already marked as active on field work',
      },
      {
        label: 'Needs Setup',
        value: String(
          technicians.filter((technician) => !technician.technicianProfileId).length,
        ),
        note: 'Employee accounts missing linked technician profiles',
      },
    ];
  });

  constructor() {
    this.loadTechnicians();
  }

  protected loadTechnicians(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.employeesApiService
      .getEmployeesPage({
        role: 'TECHNICIAN',
        page: 1,
        limit: 100,
      })
      .subscribe({
        next: (response) => {
          this.technicians.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.technicians.set([]);
          this.loading.set(false);
          this.errorMessage.set(
            'Unable to load technicians right now. Make sure the backend is available and try again.',
          );
        },
      });
  }

  protected statusSeverity(
    status: EmployeeRecord['technicianStatus'],
  ): TagSeverity {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'ON_JOB':
        return 'info';
      case 'OFFLINE':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected statusLabel(status: EmployeeRecord['technicianStatus']): string {
    return status ? status.replaceAll('_', ' ') : 'Profile Pending';
  }

  protected technicianProfileLabel(technician: EmployeeRecord): string {
    return technician.technicianProfileId ? 'Linked technician profile' : 'Technician profile missing';
  }

  protected workStateLabel(technician: EmployeeRecord): string {
    switch (technician.technicianStatus) {
      case 'AVAILABLE':
        return 'Ready for assignment';
      case 'ON_JOB':
        return 'Busy on active work';
      case 'OFFLINE':
        return 'Offline or not reporting';
      default:
        return 'Needs technician profile setup';
    }
  }
}
