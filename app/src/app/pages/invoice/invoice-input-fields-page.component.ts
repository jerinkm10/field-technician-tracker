import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

type InvoiceFieldGroup = {
  section: string;
  fields: string;
  purpose: string;
};

@Component({
  selector: 'app-invoice-input-fields-page',
  imports: [TableModule, TagModule],
  templateUrl: './invoice-input-fields-page.component.html',
  styleUrl: './invoice-input-fields-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceInputFieldsPageComponent {
  protected fieldGroups: InvoiceFieldGroup[] = [
    {
      section: 'Supplier',
      fields: 'Supplier autocomplete, GSTIN, phone, email, address, bank details',
      purpose: 'Pulled from Supplier Master and auto-filled after selection.',
    },
    {
      section: 'Invoice Header',
      fields: 'Invoice type, invoice number, invoice date, status',
      purpose: 'Controls the invoice identity and current billing lifecycle state.',
    },
    {
      section: 'Customer',
      fields: 'Customer name, address, GSTIN, place of supply',
      purpose: 'Captures the billing destination shown on the final document.',
    },
    {
      section: 'Line Items',
      fields: 'Product/service, description, HSN/SAC, quantity, unit price, CGST, SGST',
      purpose: 'Drives taxable value, GST calculations, and line totals.',
    },
    {
      section: 'Totals',
      fields: 'Total before tax, total tax amount, rounded off, total amount, amount due',
      purpose: 'Summarises the invoice financials before save.',
    },
  ];
}
