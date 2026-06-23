import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InvoiceWorkspaceComponent } from '../../invoice/components/invoice-workspace.component';

@Component({
  selector: 'app-tax-invoice-page',
  imports: [InvoiceWorkspaceComponent],
  template: `
    <app-invoice-workspace
      invoiceType="TAX"
      pageTitle="Tax invoice desk"
      pageSubtitle="Issue tax invoices with the same supplier autocomplete, instant supplier creation, and reusable line-item workflow.">
    </app-invoice-workspace>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxInvoicePageComponent {}
