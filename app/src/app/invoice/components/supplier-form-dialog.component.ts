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
  SupplierRecord,
  SupplierStatus,
  SupplierUpsertPayload,
} from '../../core/services/suppliers-api.service';

type StatusOption = {
  label: string;
  value: SupplierStatus;
};

@Component({
  selector: 'app-supplier-form-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './supplier-form-dialog.component.html',
  styleUrl: './supplier-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() supplier: SupplierRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<SupplierUpsertPayload>();

  protected statusOptions: StatusOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  protected draft: SupplierUpsertPayload = this.emptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['supplier'] ||
      changes['mode']
    ) {
      this.draft = this.supplier
        ? {
            supplierName: this.supplier.supplierName,
            phone: this.supplier.phone,
            email: this.supplier.email,
            gstin: this.supplier.gstin,
            address: this.supplier.address,
            bankName: this.supplier.bankName,
            accountNumber: this.supplier.accountNumber,
            ifscCode: this.supplier.ifscCode,
            status: this.supplier.status,
          }
        : this.emptyDraft();
    }
  }

  protected submit(): void {
    this.save.emit({
      supplierName: this.draft.supplierName.trim(),
      phone: this.draft.phone.trim(),
      email: this.draft.email.trim(),
      gstin: this.draft.gstin.trim().toUpperCase(),
      address: this.draft.address.trim(),
      bankName: this.draft.bankName.trim(),
      accountNumber: this.draft.accountNumber.trim(),
      ifscCode: this.draft.ifscCode.trim().toUpperCase(),
      status: this.draft.status,
    });
  }

  protected canSubmit(): boolean {
    return Boolean(
      this.draft.supplierName.trim() &&
        this.draft.phone.trim() &&
        this.draft.email.trim() &&
        this.draft.gstin.trim() &&
        this.draft.address.trim() &&
        this.draft.bankName.trim() &&
        this.draft.accountNumber.trim() &&
        this.draft.ifscCode.trim(),
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  private emptyDraft(): SupplierUpsertPayload {
    return {
      supplierName: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      status: 'ACTIVE',
    };
  }
}
