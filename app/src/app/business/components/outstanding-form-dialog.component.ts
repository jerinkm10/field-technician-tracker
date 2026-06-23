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
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import {
  OutstandingRecord,
  OutstandingStatus,
  OutstandingUpdatePayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

type OutstandingDraft = OutstandingRecord;

@Component({
  selector: 'app-outstanding-form-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputNumberModule,
    SelectModule,
  ],
  templateUrl: './outstanding-form-dialog.component.html',
  styleUrl: './outstanding-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutstandingFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'edit' | 'view' = 'view';
  @Input() outstanding: OutstandingRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<OutstandingUpdatePayload>();

  protected readonly statusOptions: Option<OutstandingStatus>[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  protected draft: OutstandingDraft | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['outstanding'] ||
      changes['mode']
    ) {
      this.draft = this.outstanding
        ? {
            ...this.outstanding,
            dueDate: this.outstanding.dueDate.slice(0, 10),
          }
        : null;
    }
  }

  protected applyAmountsChange(): void {
    if (!this.draft) {
      return;
    }

    this.syncDerivedFields(this.draft.status);
  }

  protected applyDueDateChange(): void {
    if (!this.draft) {
      return;
    }

    this.syncDerivedFields(this.draft.status);
  }

  protected applyStatusChange(status: OutstandingStatus): void {
    if (!this.draft) {
      return;
    }

    this.syncDerivedFields(status);
  }

  protected submit(): void {
    if (this.isReadOnly() || !this.draft) {
      return;
    }

    this.save.emit({
      paidAmount: this.roundCurrency(this.draft.paidAmount),
      creditAmount: this.roundCurrency(this.draft.creditAmount),
      dueDate: this.draft.dueDate,
      status: this.draft.status,
      note: this.draft.note ?? '',
    });
  }

  protected canSubmit(): boolean {
    return !this.isReadOnly() && Boolean(this.draft);
  }

  protected dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Outstanding' : 'Outstanding Details';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  private syncDerivedFields(requestedStatus?: OutstandingStatus): void {
    if (!this.draft) {
      return;
    }

    this.draft.outstandingAmount = this.roundCurrency(
      this.draft.totalAmount - this.draft.paidAmount - this.draft.creditAmount,
    );
    this.draft.status = this.resolveStatus(
      this.draft.dueDate,
      this.draft.outstandingAmount,
      this.draft.paidAmount,
      requestedStatus,
    );
  }

  private resolveStatus(
    dueDate: string,
    outstandingAmount: number,
    paidAmount: number,
    requestedStatus?: OutstandingStatus,
  ): OutstandingStatus {
    if (outstandingAmount <= 0) {
      return 'PAID';
    }

    if (this.isPastDue(dueDate)) {
      return 'OVERDUE';
    }

    if (requestedStatus === 'PARTIAL' && paidAmount > 0) {
      return 'PARTIAL';
    }

    if (requestedStatus === 'PENDING' && paidAmount === 0) {
      return 'PENDING';
    }

    if (paidAmount > 0) {
      return 'PARTIAL';
    }

    return 'PENDING';
  }

  private isPastDue(dueDate: string): boolean {
    const currentDate = new Date();
    const today = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    );
    const parsedDate = new Date(`${dueDate}T00:00:00`);
    const dueDateOnly = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );

    return dueDateOnly < today;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
