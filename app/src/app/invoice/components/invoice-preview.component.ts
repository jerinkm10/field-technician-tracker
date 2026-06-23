import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { BillingPreviewModel } from '../../shared/models/billing.models';

@Component({
  selector: 'app-invoice-preview',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './invoice-preview.component.html',
  styleUrl: './invoice-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicePreviewComponent {
  @Input({ required: true }) preview!: BillingPreviewModel;

  protected documentHeading(): string {
    const normalized = this.preview.documentTypeLabel.toUpperCase();

    if (normalized.includes('QUOTATION')) {
      return 'QUOTATION';
    }

    if (normalized.includes('PROFORMA')) {
      return 'PROFORMA INVOICE';
    }

    return 'INVOICE';
  }

  protected totalQuantity(): number {
    return this.preview.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected totalTaxRate(): number {
    return this.maxTaxPercent('cgstPercentage') + this.maxTaxPercent('sgstPercentage');
  }

  protected totalCgstAmount(): number {
    return this.preview.lineItems.reduce((sum, item) => sum + item.cgstAmount, 0);
  }

  protected totalSgstAmount(): number {
    return this.preview.lineItems.reduce((sum, item) => sum + item.sgstAmount, 0);
  }

  protected billToName(): string {
    return this.preview.customerName || this.preview.customer?.customerName || 'Customer';
  }

  protected billToBranch(): string {
    return this.preview.customer?.customerName || this.billToName();
  }

  protected billToAddress(): string {
    return (
      this.preview.customerAddress ||
      this.preview.customer?.billingAddress ||
      this.preview.customer?.address ||
      'Customer address'
    );
  }

  protected billToContact(): string {
    return (
      this.preview.customer?.phone ||
      this.preview.customer?.email ||
      this.billToName()
    );
  }

  protected issuerName(): string {
    return (
      this.preview.company?.companyName ||
      this.preview.supplier?.supplierName ||
      'Company'
    );
  }

  protected issuerAddressLines(): string[] {
    if (this.preview.company) {
      return [
        this.preview.company.address,
        `${this.preview.company.city}, ${this.preview.company.state} ${this.preview.company.pinCode}`,
        this.preview.company.country,
      ].filter(Boolean);
    }

    return [this.preview.supplier?.address || 'Company address'];
  }

  protected issuerPhone(): string {
    return this.preview.company?.phone || this.preview.supplier?.phone || '-';
  }

  protected issuerEmail(): string {
    return this.preview.company?.email || this.preview.supplier?.email || '-';
  }

  protected issuerBankLines(): string[] {
    if (this.preview.company) {
      return [
        this.preview.company.bankName,
        `A/C No: ${this.preview.company.accountNumber}`,
        `IFSC: ${this.preview.company.ifscCode}`,
        `GSTIN: ${this.preview.company.gstin}`,
      ];
    }

    return [
      this.preview.supplier?.bankName || '-',
      this.preview.supplier?.accountNumber
        ? `A/C No: ${this.preview.supplier.accountNumber}`
        : '',
      this.preview.supplier?.ifscCode ? `IFSC: ${this.preview.supplier.ifscCode}` : '',
      this.preview.supplier?.gstin ? `GSTIN: ${this.preview.supplier.gstin}` : '',
    ].filter(Boolean);
  }

  protected amountInWords(): string {
    const rupees = Math.floor(this.preview.totalAmount || 0);
    const paise = Math.round(((this.preview.totalAmount || 0) - rupees) * 100);
    const rupeeWords = this.numberToWords(rupees);
    const paiseWords = paise > 0 ? ` and ${this.numberToWords(paise)} Paise` : '';

    return `${rupeeWords}${paiseWords} Only`;
  }

  private maxTaxPercent(field: 'cgstPercentage' | 'sgstPercentage'): number {
    return this.preview.lineItems.reduce(
      (maxValue, item) => Math.max(maxValue, item[field]),
      0,
    );
  }

  private numberToWords(value: number): string {
    if (value === 0) {
      return 'Zero';
    }

    const belowTwenty = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];

    const toWords = (amount: number): string => {
      if (amount < 20) {
        return belowTwenty[amount];
      }

      if (amount < 100) {
        return `${tens[Math.floor(amount / 10)]}${amount % 10 ? ` ${belowTwenty[amount % 10]}` : ''}`;
      }

      if (amount < 1000) {
        return `${belowTwenty[Math.floor(amount / 100)]} Hundred${amount % 100 ? ` ${toWords(amount % 100)}` : ''}`;
      }

      if (amount < 100000) {
        return `${toWords(Math.floor(amount / 1000))} Thousand${amount % 1000 ? ` ${toWords(amount % 1000)}` : ''}`;
      }

      if (amount < 10000000) {
        return `${toWords(Math.floor(amount / 100000))} Lakh${amount % 100000 ? ` ${toWords(amount % 100000)}` : ''}`;
      }

      return `${toWords(Math.floor(amount / 10000000))} Crore${amount % 10000000 ? ` ${toWords(amount % 10000000)}` : ''}`;
    };

    return toWords(value).trim();
  }
}
