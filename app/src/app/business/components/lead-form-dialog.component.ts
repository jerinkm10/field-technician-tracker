import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  inject,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { LeadsApiService } from '../../core/services/leads-api.service';
import {
  EmployeeRecord,
  LeadRecord,
  LeadSuggestionRecord,
  LeadStatus,
  LeadUpsertPayload,
  ProductServiceRecord,
  SupplierRecord,
} from '../../shared/models/billing.models';

type Option<T> = {
  label: string;
  value: T;
};

type TagSeverity = 'success' | 'info' | 'warn' | 'danger';

@Component({
  selector: 'app-lead-form-dialog',
  imports: [
    AutoCompleteModule,
    ButtonModule,
    DatePipe,
    DialogModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './lead-form-dialog.component.html',
  styleUrl: './lead-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadFormDialogComponent implements OnChanges {
  private readonly leadsApiService = inject(LeadsApiService);

  @Input() visible = false;
  @Input() saving = false;
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() lead: LeadRecord | null = null;
  @Input() branches: SupplierRecord[] = [];
  @Input() productServices: ProductServiceRecord[] = [];
  @Input() employees: EmployeeRecord[] = [];

  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<LeadUpsertPayload>();

  protected readonly statusOptions: Option<LeadStatus>[] = [
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Follow Up', value: 'FOLLOW_UP' },
    { label: 'Demo Scheduled', value: 'DEMO_SCHEDULED' },
    { label: 'Converted', value: 'CONVERTED' },
    { label: 'Lost', value: 'LOST' },
  ];

  protected draft: LeadUpsertPayload = this.emptyDraft();
  protected leadNameValue: string | LeadSuggestionRecord = '';
  protected leadSuggestions: LeadSuggestionRecord[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['visible']?.currentValue === true ||
      changes['lead'] ||
      changes['mode']
    ) {
      this.draft = this.lead
        ? {
            leadName: this.lead.leadName,
            customerName: this.lead.customerName,
            phone: this.lead.phone,
            email: this.lead.email ?? undefined,
            location: this.lead.location,
            branchId: this.lead.branchId,
            source: this.lead.source,
            interestedProductServiceId: this.lead.interestedProductServiceId,
            assignedToEmployeeId: this.lead.assignedToEmployeeId,
            status: this.lead.status,
            note: this.lead.note ?? undefined,
            nextFollowUpDate: this.toDateInput(this.lead.nextFollowUpDate),
          }
        : this.emptyDraft();
      this.leadNameValue = this.draft.leadName;
      this.leadSuggestions = [];
    }
  }

  protected submit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.save.emit({
      leadName: this.draft.leadName.trim(),
      customerName: this.draft.customerName.trim(),
      phone: this.draft.phone.trim(),
      email: this.normalizeOptionalString(this.draft.email),
      location: this.draft.location.trim(),
      branchId: this.draft.branchId,
      source: this.draft.source.trim(),
      interestedProductServiceId: this.draft.interestedProductServiceId,
      assignedToEmployeeId: this.normalizeOptionalString(
        this.draft.assignedToEmployeeId ?? undefined,
      ) ?? null,
      status: this.draft.status,
      note: this.normalizeOptionalString(this.draft.note),
      nextFollowUpDate: this.normalizeOptionalString(this.draft.nextFollowUpDate),
    });
  }

  protected canSubmit(): boolean {
    return (
      !this.isReadOnly() &&
      Boolean(
        this.draft.leadName.trim() &&
          this.draft.customerName.trim() &&
          this.draft.phone.trim() &&
          this.draft.location.trim() &&
          this.draft.branchId &&
          this.draft.source.trim() &&
          this.draft.interestedProductServiceId &&
          this.draft.status,
      )
    );
  }

  protected handleHide(): void {
    this.cancel.emit();
  }

  protected dialogTitle(): string {
    switch (this.mode) {
      case 'edit':
        return 'Edit Lead';
      case 'view':
        return 'Lead Details';
      default:
        return 'Create Lead';
    }
  }

  protected primaryActionLabel(): string {
    return this.mode === 'edit' ? 'Update Lead' : 'Create Lead';
  }

  protected isReadOnly(): boolean {
    return this.mode === 'view';
  }

  protected statusSeverity(status: LeadStatus): TagSeverity {
    switch (status) {
      case 'NEW':
        return 'info';
      case 'CONTACTED':
      case 'FOLLOW_UP':
        return 'warn';
      case 'DEMO_SCHEDULED':
        return 'success';
      case 'CONVERTED':
        return 'success';
      default:
        return 'danger';
    }
  }

  protected searchLeadSuggestions(event: { query: string }): void {
    const query = event.query.trim();

    if (query.length < 2) {
      this.leadSuggestions = [];
      return;
    }

    this.leadsApiService.getLeadSuggestions(query).subscribe({
      next: (suggestions) => {
        this.leadSuggestions = suggestions;
      },
      error: () => {
        this.leadSuggestions = [];
      },
    });
  }

  protected handleLeadNameValueChange(
    value: string | LeadSuggestionRecord | null,
  ): void {
    if (typeof value === 'string') {
      this.draft.leadName = value;
      return;
    }

    if (!value) {
      this.draft.leadName = '';
      return;
    }

    this.draft.leadName = value.leadName;
  }

  protected applyLeadSuggestion(suggestion: LeadSuggestionRecord): void {
    this.leadNameValue = suggestion;
    this.draft.leadName = suggestion.leadName;

    if (!this.draft.customerName.trim()) {
      this.draft.customerName = suggestion.customerName;
    }

    if (!this.draft.phone.trim()) {
      this.draft.phone = suggestion.phone;
    }

    if (!this.normalizeOptionalString(this.draft.email) && suggestion.email) {
      this.draft.email = suggestion.email;
    }

    if (!this.draft.location.trim()) {
      this.draft.location = suggestion.location;
    }

    if (!this.draft.branchId) {
      this.draft.branchId = suggestion.branchId;
    }

    if (!this.draft.source.trim()) {
      this.draft.source = suggestion.source;
    }

    if (!this.draft.interestedProductServiceId) {
      this.draft.interestedProductServiceId = suggestion.interestedProductServiceId;
    }

    if (!this.draft.assignedToEmployeeId && suggestion.assignedToEmployeeId) {
      this.draft.assignedToEmployeeId = suggestion.assignedToEmployeeId;
    }
  }

  protected employeeOptions(): Option<string>[] {
    return [
      { label: 'Unassigned', value: '' },
      ...this.employees.map((employee) => ({
        label: `${employee.name} (${employee.username})`,
        value: employee.id,
      })),
    ];
  }

  private emptyDraft(): LeadUpsertPayload {
    return {
      leadName: '',
      customerName: '',
      phone: '',
      email: '',
      location: '',
      branchId: '',
      source: '',
      interestedProductServiceId: '',
      assignedToEmployeeId: '',
      status: 'NEW',
      note: '',
      nextFollowUpDate: '',
    };
  }

  private normalizeOptionalString(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private toDateInput(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }
}
