import { ChangeDetectionStrategy, Component, ContentChild, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-data-table-with-actions',
  imports: [ButtonModule, NgTemplateOutlet, TableModule],
  template: `
    <section class="panel section-shell">
      <div class="section-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>

        @if (showCreateButton) {
          <button
            pButton
            type="button"
            [label]="createLabel"
            icon="pi pi-plus"
            (click)="create.emit()">
          </button>
        }
      </div>

      <p-table [value]="records" [loading]="loading" responsiveLayout="scroll">
        <ng-template #header>
          <ng-container *ngTemplateOutlet="headerTemplate ?? null"></ng-container>
        </ng-template>

        <ng-template #body let-record>
          <ng-container
            *ngTemplateOutlet="bodyTemplate ?? null; context: { $implicit: record }">
          </ng-container>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="emptyColspan" class="empty-row">{{ emptyMessage }}</td>
          </tr>
        </ng-template>
      </p-table>

      <div class="table-footer">
        <p>{{ footerLabel }}</p>

        <div class="pagination-actions">
          <button
            pButton
            type="button"
            label="Previous"
            icon="pi pi-angle-left"
            text
            [disabled]="!hasPreviousPage"
            (click)="previousPage.emit()">
          </button>
          <span>Page {{ page }} of {{ totalPages || 1 }}</span>
          <button
            pButton
            type="button"
            label="Next"
            iconPos="right"
            icon="pi pi-angle-right"
            text
            [disabled]="!hasNextPage"
            (click)="nextPage.emit()">
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .section-header h3,
      .section-header p {
        margin: 0;
      }

      .section-header p,
      .table-footer p,
      .empty-row {
        color: var(--ftt-muted);
      }

      .table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
      }

      .table-footer p {
        margin: 0;
      }

      .pagination-actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .empty-row {
        text-align: center;
        padding: 1.2rem;
      }

      @media (max-width: 720px) {
        .section-header,
        .table-footer,
        .pagination-actions {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableWithActionsComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() createLabel = 'Create';
  @Input() showCreateButton = false;
  @Input() records: unknown[] = [];
  @Input() loading = false;
  @Input() footerLabel = '';
  @Input() emptyMessage = 'No records found.';
  @Input() emptyColspan = 1;
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() hasPreviousPage = false;
  @Input() hasNextPage = false;

  @Output() readonly create = new EventEmitter<void>();
  @Output() readonly previousPage = new EventEmitter<void>();
  @Output() readonly nextPage = new EventEmitter<void>();

  @ContentChild('header') headerTemplate?: TemplateRef<unknown>;
  @ContentChild('body') bodyTemplate?: TemplateRef<unknown>;
}
