import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

import {
  AmcBillingPeriod,
  AmcRecord,
  CompanyRecord,
} from '../../shared/models/billing.models';

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-amc-preview-dialog',
  imports: [ButtonModule, DatePipe, DecimalPipe, DialogModule, TagModule],
  templateUrl: './amc-preview-dialog.component.html',
  styleUrl: './amc-preview-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmcPreviewDialogComponent {
  @Input() visible = false;
  @Input() amc: AmcRecord | null = null;
  @Input() company: CompanyRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly downloadPdf = new EventEmitter<void>();
  @Output() readonly createInvoice = new EventEmitter<void>();

  protected billingPeriodLabel(billingPeriod: AmcBillingPeriod): string {
    switch (billingPeriod) {
      case 'QUARTERLY':
        return 'Quarterly';
      case 'HALF_YEARLY':
        return 'Half yearly';
      default:
        return 'Yearly';
    }
  }

  protected statusSeverity(status: AmcRecord['status']): TagSeverity {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'danger';
      default:
        return 'warn';
    }
  }

  protected handleHide(): void {
    this.cancel.emit();
  }
}
