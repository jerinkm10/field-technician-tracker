import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

type TagSeverity = 'success' | 'info' | 'warn';

type TechnicianRecord = {
  readonly name: string;
  readonly zone: string;
  readonly phone: string;
  readonly status: 'Available' | 'On Job' | 'Offline';
};

@Component({
  selector: 'app-technicians-page',
  imports: [ButtonModule, TagModule],
  templateUrl: './technicians-page.component.html',
  styleUrl: './technicians-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechniciansPageComponent {
  protected readonly technicians: readonly TechnicianRecord[] = [
    { name: 'Akhil Mathew', zone: 'Central District', phone: '+91 98765 43210', status: 'On Job' },
    { name: 'Riya John', zone: 'North Zone', phone: '+91 98765 43211', status: 'Available' },
    { name: 'Joel Varghese', zone: 'Industrial Belt', phone: '+91 98765 43212', status: 'Offline' }
  ];

  protected statusSeverity(status: TechnicianRecord['status']): TagSeverity {
    switch (status) {
      case 'Available':
        return 'success';
      case 'On Job':
        return 'info';
      default:
        return 'warn';
    }
  }
}
