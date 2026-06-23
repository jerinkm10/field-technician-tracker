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

  protected amountInWords(): string {
    const rupees = Math.floor(this.preview.totalAmount || 0);
    const paise = Math.round(((this.preview.totalAmount || 0) - rupees) * 100);
    const rupeeWords = this.numberToWords(rupees);
    const paiseWords = paise > 0 ? ` and ${this.numberToWords(paise)} Paise` : '';

    return `Indian Rupees ${rupeeWords}${paiseWords} Only`;
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
