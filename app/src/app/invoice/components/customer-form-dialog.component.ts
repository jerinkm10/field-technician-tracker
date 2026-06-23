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
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  CustomerRecord,
  CustomerStatus,
  CustomerUpsertPayload,
} from '../../shared/models/billing.models';

type StatusOption = {
  label: string;
  value: CustomerStatus;
};

@Component({
  selector: 'app-customer-form-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './customer-form-dialog.component.html',
  styleUrl: './customer-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() customer: CustomerRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<CustomerUpsertPayload>();

  protected statusOptions: StatusOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected draft: CustomerUpsertPayload = this.emptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['customer'] ||
      changes['mode']
    ) {
      this.draft = this.customer
        ? {
            customerName: this.customer.customerName,
            phone: this.customer.phone,
            email: this.customer.email ?? '',
            gstin: this.customer.gstin ?? '',
            billingAddress: this.customer.billingAddress,
            shippingAddress: this.customer.shippingAddress,
            placeOfSupply: this.customer.placeOfSupply ?? '',
            address: this.customer.address,
            latitude: this.customer.latitude,
            longitude: this.customer.longitude,
            status: this.customer.status,
          }
        : this.emptyDraft();
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      customerName: this.draft.customerName.trim(),
      phone: this.draft.phone.trim(),
      email: this.draft.email.trim(),
      gstin: this.draft.gstin.trim().toUpperCase(),
      billingAddress: this.draft.billingAddress.trim(),
      shippingAddress: this.draft.shippingAddress.trim(),
      placeOfSupply: this.draft.placeOfSupply.trim(),
      address:
        this.draft.address.trim() || this.draft.billingAddress.trim(),
      latitude: this.draft.latitude ?? null,
      longitude: this.draft.longitude ?? null,
      status: this.draft.status,
    });
  }

  protected canSubmit(): boolean {
    return !this.isReadOnly() && Boolean(
      this.draft.customerName.trim() &&
        this.draft.phone.trim() &&
        this.draft.billingAddress.trim(),
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit Customer';
      case 'view':
        return 'Customer Details';
      default:
        return 'Create Customer';
    }
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit' ? 'Update Customer' : 'Create Customer';
  }

  private emptyDraft(): CustomerUpsertPayload {
    return {
      customerName: '',
      phone: '',
      email: '',
      gstin: '',
      billingAddress: '',
      shippingAddress: '',
      placeOfSupply: '',
      address: '',
      latitude: null,
      longitude: null,
      status: 'ACTIVE',
    };
  }
}
