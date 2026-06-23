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

import { ProductServicesApiService } from '../../core/services/product-services-api.service';
import { ProductServiceRecord } from '../../shared/models/billing.models';

@Component({
  selector: 'app-product-service-autocomplete',
  imports: [AutoCompleteModule, FormsModule],
  template: `
    <p-autoComplete
      [(ngModel)]="searchValue"
      [suggestions]="suggestions()"
      optionLabel="name"
      [dropdown]="true"
      [showClear]="true"
      [disabled]="disabled"
      [placeholder]="placeholder"
      appendTo="body"
      (completeMethod)="searchProductServices($event.query)"
      (ngModelChange)="handleModelChange($event)"
      (onSelect)="handleSelection($event.value)"
      (onClear)="clearSelection()">
      <ng-template let-item #item>
        <div class="suggestion-row">
          <strong>{{ item.name }}</strong>
          <span>{{ item.type }} | {{ item.hsnSacCode }} | Rs. {{ item.defaultRate }}</span>
        </div>
      </ng-template>
    </p-autoComplete>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 14rem;
      }

      .suggestion-row {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .suggestion-row span {
        color: var(--ftt-muted);
        font-size: 0.84rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductServiceAutocompleteComponent implements OnChanges {
  @Input() value = '';
  @Input() disabled = false;
  @Input() placeholder = 'Search product or service';

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly selected = new EventEmitter<ProductServiceRecord | null>();

  private readonly productServicesApiService = inject(ProductServicesApiService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected readonly suggestions = signal<ProductServiceRecord[]>([]);
  protected searchValue: string | ProductServiceRecord | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.searchValue = this.value;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected searchProductServices(query: string): void {
    this.productServicesApiService
      .getProductServicesPage({
        search: query,
        status: 'ACTIVE',
        limit: 10,
        page: 1,
      })
      .subscribe({
        next: (response) => {
          this.suggestions.set(response.data);
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.suggestions.set([]);
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  protected handleModelChange(value: string | ProductServiceRecord | null): void {
    if (typeof value === 'string') {
      this.valueChange.emit(value);
      return;
    }

    if (value === null) {
      this.valueChange.emit('');
    }
  }

  protected handleSelection(productService: ProductServiceRecord | null): void {
    if (!productService) {
      return;
    }

    this.valueChange.emit(productService.name);
    this.selected.emit(productService);
  }

  protected clearSelection(): void {
    this.valueChange.emit('');
    this.selected.emit(null);
  }
}
