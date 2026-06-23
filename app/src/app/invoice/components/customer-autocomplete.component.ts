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
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';

import { CustomersApiService } from '../../core/services/customers-api.service';
import { CustomerRecord } from '../../shared/models/billing.models';

type CustomerSuggestion = CustomerRecord & {
  displayLabel: string;
};

@Component({
  selector: 'app-customer-autocomplete',
  imports: [AutoCompleteModule, ButtonModule, FormsModule],
  template: `
    <div class="autocomplete-shell">
      <p-autoComplete
        [(ngModel)]="searchValue"
        [suggestions]="suggestions()"
        optionLabel="displayLabel"
        [forceSelection]="true"
        [dropdown]="true"
        [showClear]="true"
        [disabled]="disabled"
        [placeholder]="placeholder"
        appendTo="body"
        (completeMethod)="searchCustomers($event.query)"
        (onSelect)="handleSelection($event.value)"
        (onClear)="clearSelection()">
      </p-autoComplete>

      <button
        pButton
        type="button"
        label="+ Create Customer"
        text
        [disabled]="disabled"
        (click)="createRequested.emit()">
      </button>
    </div>
  `,
  styles: [
    `
      .autocomplete-shell {
        display: grid;
        gap: 0.6rem;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      @media (max-width: 720px) {
        .autocomplete-shell {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerAutocompleteComponent implements OnChanges {
  @Input() selectedCustomer: CustomerRecord | null = null;
  @Input() placeholder = 'Search customer by name, phone, or GSTIN';
  @Input() disabled = false;

  @Output() readonly selectedCustomerChange = new EventEmitter<CustomerRecord | null>();
  @Output() readonly createRequested = new EventEmitter<void>();

  private readonly customersApiService = inject(CustomersApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly suggestions = signal<CustomerSuggestion[]>([]);
  protected searchValue: CustomerSuggestion | string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCustomer']) {
      this.searchValue = this.selectedCustomer
        ? this.toSuggestion(this.selectedCustomer)
        : null;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected searchCustomers(query: string): void {
    this.customersApiService.listCustomers(query).subscribe({
      next: (customers) => {
        this.suggestions.set(customers.map((customer) => this.toSuggestion(customer)));
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.suggestions.set([]);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected handleSelection(customer: CustomerSuggestion | null): void {
    this.selectedCustomerChange.emit(customer ? this.toRecord(customer) : null);
  }

  protected clearSelection(): void {
    this.selectedCustomerChange.emit(null);
  }

  private toSuggestion(customer: CustomerRecord): CustomerSuggestion {
    return {
      ...customer,
      displayLabel: `${customer.customerName} | ${customer.phone} | ${customer.gstin ?? 'No GSTIN'}`,
    };
  }

  private toRecord(customer: CustomerSuggestion): CustomerRecord {
    const { displayLabel: _displayLabel, ...record } = customer;
    return record;
  }
}
