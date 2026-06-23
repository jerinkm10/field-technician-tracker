import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

import { LedgerDocumentType, LedgerRecord } from '../../shared/models/billing.models';

type TagSeverity = 'success' | 'warn' | 'danger' | 'info';

@Component({
  selector: 'app-ledger-detail-dialog',
  imports: [ButtonModule, DatePipe, DecimalPipe, DialogModule, TagModule],
  templateUrl: './ledger-detail-dialog.component.html',
  styleUrl: './ledger-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LedgerDetailDialogComponent {
  @Input() visible = false;
  @Input() ledgerEntry: LedgerRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected typeLabel(type: LedgerDocumentType): string {
    switch (type) {
      case 'PROFORMA_INVOICE':
        return 'Proforma Invoice';
      case 'TAX_INVOICE':
        return 'Tax Invoice';
      case 'AMC_INVOICE':
        return 'AMC Invoice';
      case 'OUTSTANDING':
        return 'Outstanding';
      default:
        return 'Quotation';
    }
  }

  protected statusSeverity(status: string): TagSeverity {
    switch (status) {
      case 'PAID':
      case 'ISSUED':
      case 'ACTIVE':
      case 'ACCEPTED':
        return 'success';
      case 'OVERDUE':
      case 'CANCELLED':
      case 'REJECTED':
      case 'EXPIRED':
        return 'danger';
      case 'PARTIAL':
      case 'PENDING':
      case 'DRAFT':
      case 'SENT':
        return 'warn';
      default:
        return 'info';
    }
  }
}
