import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-filter-dropdown',
  imports: [ButtonModule, PopoverModule],
  template: `
    <button
      pButton
      type="button"
      [label]="label"
      [icon]="icon"
      outlined
      (click)="popover.toggle($event)">
    </button>

    <p-popover #popover appendTo="body">
      <div class="filter-popover">
        <ng-content></ng-content>
      </div>
    </p-popover>
  `,
  styles: [
    `
      .filter-popover {
        min-width: min(82vw, 22rem);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterDropdownComponent {
  @Input() label = 'Filter';
  @Input() icon = 'pi pi-filter';
}
