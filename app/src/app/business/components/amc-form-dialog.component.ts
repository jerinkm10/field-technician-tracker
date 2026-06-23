import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  AmcBillingPeriod,
  AmcRecord,
  AmcStatus,
  AmcUpsertPayload,
  CustomerRecord,
  SupplierRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

type AmcDraft = {
  amcNumber: string;
  customerId: string;
  customerName: string;
  branchId: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  billingPeriod: AmcBillingPeriod;
  billingPeriodMonths: number;
  contractAmount: number;
  taxPercentage: number;
  status: AmcStatus;
  lastPaidDate: string;
  nextBillingDate: string;
  note: string;
};

@Component({
  selector: 'app-amc-form-dialog',
  imports: [
    ButtonModule,
    DatePipe,
    DialogModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './amc-form-dialog.component.html',
  styleUrl: './amc-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmcFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() amc: AmcRecord | null = null;
  @Input() customers: CustomerRecord[] = [];
  @Input() branches: SupplierRecord[] = [];

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<AmcUpsertPayload>();
  @Output() readonly preview = new EventEmitter<void>();
  @Output() readonly downloadPdf = new EventEmitter<void>();
  @Output() readonly createInvoice = new EventEmitter<void>();

  protected readonly billingPeriodOptions: Option<AmcBillingPeriod>[] = [
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Half yearly', value: 'HALF_YEARLY' },
    { label: 'Yearly', value: 'YEARLY' },
  ];

  protected readonly statusOptions: Option<AmcStatus>[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Expired', value: 'EXPIRED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  protected draft: AmcDraft = this.emptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true || changes['amc'] || changes['mode']) {
      this.draft = this.amc
        ? {
            amcNumber: this.amc.amcNumber,
            customerId: this.amc.customerId,
            customerName: this.amc.customerName,
            branchId: this.amc.branchId,
            startDate: this.amc.startDate.slice(0, 10),
            endDate: this.amc.endDate.slice(0, 10),
            durationMonths: this.amc.durationMonths,
            billingPeriod: this.amc.billingPeriod,
            billingPeriodMonths: this.amc.billingPeriodMonths,
            contractAmount: this.amc.contractAmount,
            taxPercentage: this.amc.taxPercentage,
            status: this.amc.status,
            lastPaidDate: this.amc.lastPaidDate?.slice(0, 10) ?? '',
            nextBillingDate: this.amc.nextBillingDate?.slice(0, 10) ?? '',
            note: this.amc.note ?? '',
          }
        : this.emptyDraft();
    }
  }

  protected handleCustomerChange(customerId: string): void {
    const customer = this.customers.find((record) => record.id === customerId);
    this.draft.customerName = customer?.customerName ?? '';
  }

  protected syncDerivedFields(): void {
    this.draft.durationMonths = this.calculateDurationMonths(
      this.draft.startDate,
      this.draft.endDate,
    );
    this.draft.billingPeriodMonths = this.resolveBillingPeriodMonths(
      this.draft.billingPeriod,
    );

    if (!this.draft.nextBillingDate && this.draft.startDate) {
      this.draft.nextBillingDate = this.draft.startDate;
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      amcNumber: this.draft.amcNumber.trim(),
      customerId: this.draft.customerId,
      customerName: this.draft.customerName,
      branchId: this.draft.branchId,
      startDate: this.draft.startDate,
      endDate: this.draft.endDate,
      billingPeriod: this.draft.billingPeriod,
      contractAmount: this.draft.contractAmount,
      taxPercentage: this.draft.taxPercentage,
      status: this.draft.status,
      lastPaidDate: this.draft.lastPaidDate || undefined,
      nextBillingDate: this.draft.nextBillingDate || undefined,
      note: this.draft.note.trim() || undefined,
    });
  }

  protected canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.amcNumber.trim() &&
          this.draft.customerId &&
          this.draft.branchId &&
          this.draft.startDate &&
          this.draft.endDate &&
          Number.isFinite(this.draft.contractAmount) &&
          Number.isFinite(this.draft.taxPercentage),
      )
    );
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit AMC';
      case 'view':
        return 'AMC Details';
      default:
        return 'Create AMC';
    }
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit' ? 'Update AMC' : 'Create AMC';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  private emptyDraft(): AmcDraft {
    const today = new Date().toISOString().slice(0, 10);

    return {
      amcNumber: '',
      customerId: '',
      customerName: '',
      branchId: '',
      startDate: today,
      endDate: today,
      durationMonths: 1,
      billingPeriod: 'YEARLY',
      billingPeriodMonths: 12,
      contractAmount: 0,
      taxPercentage: 18,
      status: 'ACTIVE',
      lastPaidDate: '',
      nextBillingDate: today,
      note: '',
    };
  }

  private resolveBillingPeriodMonths(billingPeriod: AmcBillingPeriod): number {
    switch (billingPeriod) {
      case 'QUARTERLY':
        return 3;
      case 'HALF_YEARLY':
        return 6;
      default:
        return 12;
    }
  }

  private calculateDurationMonths(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const totalMonths = yearDiff * 12 + monthDiff;

    return totalMonths + (end.getDate() >= start.getDate() ? 1 : 0);
  }
}
