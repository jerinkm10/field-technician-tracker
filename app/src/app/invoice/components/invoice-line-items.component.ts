import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { BillingLineItemPayload } from '../../shared/models/billing.models';

@Component({
  selector: 'app-invoice-line-items',
  imports: [
    ButtonModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
  ],
  templateUrl: './invoice-line-items.component.html',
  styleUrl: './invoice-line-items.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceLineItemsComponent implements OnChanges {
  @Input() lineItems: BillingLineItemPayload[] = [];
  @Input() readonly = false;

  @Output() readonly lineItemsChange = new EventEmitter<BillingLineItemPayload[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected workingLineItems: BillingLineItemPayload[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lineItems']) {
      this.workingLineItems = this.lineItems.length
        ? this.lineItems.map((item) => ({ ...item }))
        : [this.emptyLineItem()];
      this.changeDetectorRef.markForCheck();
    }
  }

  protected addLineItem(): void {
    if (this.readonly) {
      return;
    }

    this.workingLineItems = [...this.workingLineItems, this.emptyLineItem()];
    this.emitChange();
  }

  protected removeLineItem(index: number): void {
    if (this.readonly) {
      return;
    }

    this.workingLineItems =
      this.workingLineItems.length === 1
        ? [this.emptyLineItem()]
        : this.workingLineItems.filter((_, itemIndex) => itemIndex !== index);
    this.emitChange();
  }

  protected recalculateLine(index: number): void {
    const lineItem = this.workingLineItems[index];
    const taxableValue =
      this.valueOrZero(lineItem.quantity) * this.valueOrZero(lineItem.unitPrice);

    lineItem.cgstAmount = this.roundCurrency(
      (taxableValue * this.valueOrZero(lineItem.cgstPercentage)) / 100,
    );
    lineItem.sgstAmount = this.roundCurrency(
      (taxableValue * this.valueOrZero(lineItem.sgstPercentage)) / 100,
    );
    lineItem.lineAmount = this.roundCurrency(
      taxableValue + lineItem.cgstAmount + lineItem.sgstAmount,
    );

    this.emitChange();
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  private emitChange(): void {
    this.lineItemsChange.emit(this.workingLineItems.map((item) => ({ ...item })));
    this.changeDetectorRef.markForCheck();
  }

  private emptyLineItem(): BillingLineItemPayload {
    return {
      productServiceName: '',
      description: '',
      hsnSac: '',
      quantity: 1,
      unitPrice: 0,
      cgstAmount: 0,
      cgstPercentage: 9,
      sgstAmount: 0,
      sgstPercentage: 9,
      lineAmount: 0,
    };
  }

  private valueOrZero(value: number | null | undefined): number {
    return Number.isFinite(value) ? Number(value) : 0;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
