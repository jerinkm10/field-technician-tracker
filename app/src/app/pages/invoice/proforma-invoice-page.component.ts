import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InvoiceWorkspaceComponent } from '../../invoice/components/invoice-workspace.component';

@Component({
  selector: 'app-proforma-invoice-page',
  imports: [InvoiceWorkspaceComponent],
  template: `
    <app-invoice-workspace
      invoiceType="PROFORMA"
      pageTitle="Proforma invoice desk"
      pageSubtitle="Create and manage draft commercial offers with a shared supplier lookup and inline line-item editor.">
    </app-invoice-workspace>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProformaInvoicePageComponent {}
