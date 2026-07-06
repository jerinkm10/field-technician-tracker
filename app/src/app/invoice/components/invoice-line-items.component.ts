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
import { ProductServiceFormDialogComponent } from '../../business/components/product-service-form-dialog.component';
import { ProductServiceAutocompleteComponent } from '../../business/components/product-service-autocomplete.component';
import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import {
  BillingLineItemPayload,
  ProductServiceRecord,
  ProductServiceUpsertPayload,
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
  private readonly productServicesApiService = inject(ProductServicesApiService);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected workingLineItems: BillingLineItemPayload[] = [];
  protected productServiceDialogVisible = false;
  protected savingProductService = false;
  protected productServiceDialogSeed: Partial<ProductServiceUpsertPayload> | null = null;

  private pendingProductServiceRowIndex: number | null = null;

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

  protected openProductServiceDialog(index: number): void {
    if (this.readonly) {
      return;
    }

    const lineItem = this.workingLineItems[index];
    this.pendingProductServiceRowIndex = index;
    this.productServiceDialogSeed = {
      name: lineItem.productServiceName.trim(),
      description: lineItem.description.trim(),
      hsnSacCode: lineItem.hsnSac.trim(),
      defaultRate: this.valueOrZero(lineItem.unitPrice),
      taxPercentage: this.roundCurrency(
        this.valueOrZero(lineItem.cgstPercentage) +
          this.valueOrZero(lineItem.sgstPercentage),
      ),
    };
    this.productServiceDialogVisible = true;
    this.changeDetectorRef.markForCheck();
  }

  protected closeProductServiceDialog(): void {
    this.productServiceDialogVisible = false;
    this.savingProductService = false;
    this.productServiceDialogSeed = null;
    this.pendingProductServiceRowIndex = null;
    this.changeDetectorRef.markForCheck();
  }

  protected createProductService(payload: ProductServiceUpsertPayload): void {
    const rowIndex = this.pendingProductServiceRowIndex;
    if (rowIndex === null) {
      return;
    }

    this.savingProductService = true;
    this.changeDetectorRef.markForCheck();

    this.productServicesApiService.createProductService(payload).subscribe({
      next: (productService) => {
        this.savingProductService = false;
        this.productServiceDialogVisible = false;
        this.productServiceDialogSeed = null;
        this.pendingProductServiceRowIndex = null;

        if (rowIndex < this.workingLineItems.length) {
          this.applyProductServiceSelection(rowIndex, productService);
        }

        this.uiFeedback.success(
          'Product / service created',
          `"${productService.name}" was created and selected.`,
        );
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        this.savingProductService = false;
        const message = this.uiFeedback.extractErrorMessage(
          error,
          'Product / service creation failed. Check the details and try again.',
        );
        this.uiFeedback.error('Product / service creation failed', message);
        this.changeDetectorRef.markForCheck();
      },
    });
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
