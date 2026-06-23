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
import { ProductServiceAutocompleteComponent } from '../../business/components/product-service-autocomplete.component';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import {
  BillingLineItemPayload,
  ProductServiceRecord,
} from '../../shared/models/billing.models';

@Component({
  selector: 'app-invoice-line-items',
  imports: [
    ButtonModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    ProductServiceAutocompleteComponent,
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

  protected updateProductServiceName(index: number, value: string): void {
    this.workingLineItems[index].productServiceName = value;
    this.emitChange();
  }

  protected updateTextField(
    index: number,
    field: 'description' | 'hsnSac',
    value: string,
  ): void {
    this.workingLineItems[index][field] = value;
    this.emitChange();
  }

  protected applyProductServiceSelection(
    index: number,
    productService: ProductServiceRecord | null,
  ): void {
    if (!productService) {
      return;
    }

    const lineItem = this.workingLineItems[index];
    const splitTaxPercentage = this.roundCurrency(productService.taxPercentage / 2);

    lineItem.productServiceName = productService.name;
    lineItem.description = productService.description;
    lineItem.hsnSac = productService.hsnSacCode;
    lineItem.unitPrice = productService.defaultRate;
    lineItem.cgstPercentage = splitTaxPercentage;
    lineItem.sgstPercentage = splitTaxPercentage;

    this.recalculateLine(index);
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
