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
  InvoiceInputFieldRecord,
  InvoiceInputFieldUpsertPayload,
} from '../../shared/models/billing.models';

type Option = {
  label: string;
  value: string | boolean;
};

@Component({
  selector: 'app-invoice-input-field-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './invoice-input-field-dialog.component.html',
  styleUrl: './invoice-input-field-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceInputFieldDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() field: InvoiceInputFieldRecord | null = null;

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<InvoiceInputFieldUpsertPayload>();

  protected readonly inputTypeOptions: Option[] = [
    { label: 'Text', value: 'text' },
    { label: 'Textarea', value: 'textarea' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
    { label: 'Autocomplete', value: 'autocomplete' },
  ];

  protected readonly activeOptions: Option[] = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  protected draft: InvoiceInputFieldUpsertPayload = this.emptyDraft();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['field'] ||
      changes['mode']
    ) {
      this.draft = this.field
        ? {
            section: this.field.section,
            fieldKey: this.field.fieldKey,
            label: this.field.label,
            inputType: this.field.inputType,
            placeholder: this.field.placeholder ?? '',
            isActive: this.field.isActive,
          }
        : this.emptyDraft();
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      section: this.draft.section.trim(),
      fieldKey: this.draft.fieldKey.trim(),
      label: this.draft.label.trim(),
      inputType: this.draft.inputType,
      placeholder: this.draft.placeholder?.trim() || '',
      isActive: this.draft.isActive,
    });
  }

  protected canSubmit(): boolean {
    return !this.isReadOnly() && Boolean(
      this.draft.section.trim() &&
        this.draft.fieldKey.trim() &&
        this.draft.label.trim() &&
        this.draft.inputType,
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit Invoice Input Field';
      case 'view':
        return 'Invoice Input Field Details';
      default:
        return 'Create Invoice Input Field';
    }
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit' ? 'Update Field' : 'Create Field';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  private emptyDraft(): InvoiceInputFieldUpsertPayload {
    return {
      section: '',
      fieldKey: '',
      label: '',
      inputType: 'text',
      placeholder: '',
      isActive: true,
    };
  }
}
