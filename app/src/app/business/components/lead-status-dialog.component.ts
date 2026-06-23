import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import {
  LeadRecord,
  LeadStatus,
  LeadStatusUpdatePayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

@Component({
  selector: 'app-lead-status-dialog',
  imports: [ButtonModule, DialogModule, FormsModule, SelectModule],
  templateUrl: './lead-status-dialog.component.html',
  styleUrl: './lead-status-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadStatusDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() lead: LeadRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<LeadStatusUpdatePayload>();

  protected readonly statusOptions: Option<LeadStatus>[] = [
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Follow Up', value: 'FOLLOW_UP' },
    { label: 'Demo Scheduled', value: 'DEMO_SCHEDULED' },
    { label: 'Converted', value: 'CONVERTED' },
    { label: 'Lost', value: 'LOST' },
  ];

  protected draft: LeadStatusUpdatePayload = {
    status: 'NEW',
    note: '',
    nextFollowUpDate: '',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['lead']
    ) {
      this.draft = {
        status: this.lead?.status ?? 'NEW',
        note: '',
        nextFollowUpDate: this.lead?.nextFollowUpDate?.slice(0, 10) ?? '',
      };
    }
  }

  protected submit(): void {
    this.save.emit({
      status: this.draft.status,
      note: this.normalizeOptionalString(this.draft.note),
      nextFollowUpDate: this.normalizeOptionalString(this.draft.nextFollowUpDate),
    });
  }

  protected canSubmit(): boolean {
    return Boolean(this.draft.status);
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  private normalizeOptionalString(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }
}
