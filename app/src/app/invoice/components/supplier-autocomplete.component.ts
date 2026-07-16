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

import { SuppliersApiService } from '../../core/services/suppliers-api.service';
import { SupplierRecord } from '../../shared/models/billing.models';

type SupplierSuggestion = SupplierRecord & {
  displayLabel: string;
};

@Component({
  selector: 'app-supplier-autocomplete',
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
        (completeMethod)="searchSuppliers($event.query)"
        (onSelect)="handleSelection($event.value)"
        (onClear)="clearSelection()">
      </p-autoComplete>

      @if (showCreateAction) {
        <button
          pButton
          type="button"
          label="+ Create Branch"
          text
          [disabled]="disabled"
          (click)="createRequested.emit()">
        </button>
      }
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
export class SupplierAutocompleteComponent implements OnChanges {
  @Input() selectedSupplier: SupplierRecord | null = null;
  @Input() placeholder = 'Search branch by name, phone, or GSTIN';
  @Input() disabled = false;
  @Input() showCreateAction = true;

  @Output() readonly selectedSupplierChange = new EventEmitter<SupplierRecord | null>();
  @Output() readonly createRequested = new EventEmitter<void>();

  private readonly suppliersApiService = inject(SuppliersApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly suggestions = signal<SupplierSuggestion[]>([]);
  protected searchValue: SupplierSuggestion | string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedSupplier']) {
      this.searchValue = this.selectedSupplier
        ? this.toSuggestion(this.selectedSupplier)
        : null;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected searchSuppliers(query: string): void {
    this.suppliersApiService.searchSuppliers(query).subscribe({
      next: (suppliers) => {
        this.suggestions.set(suppliers.map((supplier) => this.toSuggestion(supplier)));
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.suggestions.set([]);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  protected handleSelection(supplier: SupplierSuggestion | null): void {
    this.selectedSupplierChange.emit(supplier ? this.toRecord(supplier) : null);
  }

  protected clearSelection(): void {
    this.selectedSupplierChange.emit(null);
  }

  private toSuggestion(supplier: SupplierRecord): SupplierSuggestion {
    return {
      ...supplier,
      displayLabel: `${supplier.supplierName} | ${supplier.phone} | ${supplier.gstin}`,
    };
  }

  private toRecord(supplier: SupplierSuggestion): SupplierRecord {
    const { displayLabel: _displayLabel, ...record } = supplier;
    return record;
  }
}
