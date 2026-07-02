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
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  ProductServiceRecord,
  ProductServiceStatus,
  ProductServiceType,
  ProductServiceUpsertPayload,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

@Component({
  selector: 'app-product-service-form-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './product-service-form-dialog.component.html',
  styleUrl: './product-service-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductServiceFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() productService: ProductServiceRecord | null = null;
  @Input() initialDraft: Partial<ProductServiceUpsertPayload> | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<ProductServiceUpsertPayload>();

  protected readonly typeOptions: Option<ProductServiceType>[] = [
    { label: 'Product', value: 'PRODUCT' },
    { label: 'Service', value: 'SERVICE' },
  ];

  protected readonly statusOptions: Option<ProductServiceStatus>[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected draft: ProductServiceUpsertPayload = this.emptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['productService'] ||
      changes['mode'] ||
      changes['initialDraft']
    ) {
      this.draft = this.buildDraft();
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      name: this.draft.name.trim(),
      type: this.draft.type,
      description: this.draft.description.trim(),
      hsnSacCode: this.draft.hsnSacCode.trim().toUpperCase(),
      unit: this.draft.unit.trim(),
      defaultRate: this.draft.defaultRate,
      taxPercentage: this.draft.taxPercentage,
      status: this.draft.status,
    });
  }

  protected canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.name.trim() &&
          this.draft.description.trim() &&
          this.draft.hsnSacCode.trim() &&
          this.draft.unit.trim() &&
          Number.isFinite(this.draft.defaultRate) &&
          Number.isFinite(this.draft.taxPercentage),
      )
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit Product and Service';
      case 'view':
        return 'Product and Service Details';
      default:
        return 'Create Product and Service';
    }
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit'
      ? 'Update Product and Service'
      : 'Create Product and Service';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  private buildDraft(): ProductServiceUpsertPayload {
    const baseDraft = this.productService
      ? {
          name: this.productService.name,
          type: this.productService.type,
          description: this.productService.description,
          hsnSacCode: this.productService.hsnSacCode,
          unit: this.productService.unit,
          defaultRate: this.productService.defaultRate,
          taxPercentage: this.productService.taxPercentage,
          status: this.productService.status,
        }
      : this.emptyDraft();

    if (this.mode !== 'create' || this.productService || !this.initialDraft) {
      return baseDraft;
    }

    return {
      ...baseDraft,
      ...this.initialDraft,
    };
  }

  private emptyDraft(): ProductServiceUpsertPayload {
    return {
      name: '',
      type: 'PRODUCT',
      description: '',
      hsnSacCode: '',
      unit: '',
      defaultRate: 0,
      taxPercentage: 18,
      status: 'ACTIVE',
    };
  }
}
