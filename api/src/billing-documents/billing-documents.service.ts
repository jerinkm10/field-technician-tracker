import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import PDFDocument = require('pdfkit');

type BillingParty = {
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
};

type BillingLineItem = {
  productServiceName: string;
  description?: string | null;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  cgstPercentage: number;
  cgstAmount: number;
  sgstPercentage: number;
  sgstAmount: number;
  lineAmount: number;
};

type CompanyBranding = {
  companyName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  logoAttachment?: string | null;
  signatureAttachment?: string | null;
  logoFilePath?: string | null;
  signatureFilePath?: string | null;
};

export type BillingDocumentPdfData = {
  company: CompanyBranding | null;
  documentTypeLabel: string;
  documentNumber: string;
  documentDate: Date;
  validUntil?: Date | null;
  supplier: BillingParty;
  customer: BillingParty & {
    placeOfSupply?: string | null;
  };
  lineItems: BillingLineItem[];
  totalBeforeTax: number;
  totalTaxAmount: number;
  roundedOff: number;
  totalAmount: number;
  amountDue?: number | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  status?: string | null;
};

@Injectable()
export class BillingDocumentsService {
  async buildPdfBuffer(data: BillingDocumentPdfData): Promise<Buffer> {
    const document = new PDFDocument({
      margin: 42,
      size: 'A4',
    });

    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const completed = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      document.on('error', reject);
    });

    this.drawDocument(document, data);
    document.end();

    return completed;
  }

  private drawDocument(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
  ): void {
    const pageWidth = document.page.width;
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;
    const blue = '#1d4ed8';
    const slate = '#0f172a';
    const muted = '#475569';
    const lightBorder = '#cbd5e1';
    const rightColumnX = margin + contentWidth - 190;
    const company = data.company;
    const companyLogoX = margin;
    const companyLogoY = 38;
    const companyLogoSize = 54;
    const hasLogo = Boolean(
      company?.logoFilePath && existsSync(company.logoFilePath),
    );
    const companyTextX = hasLogo ? margin + 72 : margin;
    const companyLines = company
      ? [
          company.address,
          `${company.city}, ${company.state} ${company.pinCode}`,
          company.country,
          `Phone: ${company.phone} | Email: ${company.email}`,
          `GSTIN: ${company.gstin}`,
          `Bank: ${company.bankName}`,
          `A/C: ${company.accountNumber} | IFSC: ${company.ifscCode}`,
        ]
      : ['Service Operations and Billing Desk'];

    if (hasLogo && company?.logoFilePath) {
      document.image(company.logoFilePath, companyLogoX, companyLogoY, {
        fit: [companyLogoSize, companyLogoSize],
        valign: 'center',
      });
    }

    document.font('Helvetica-Bold').fontSize(16).fillColor(blue);
    document.text(company?.companyName || 'Field Technician Tracker', companyTextX, 42, {
      width: 270,
    });
    document.font('Helvetica').fontSize(9).fillColor(muted);
    document.text(companyLines.join('\n'), companyTextX, 62, {
      width: 270,
      lineGap: 2,
    });

    document.font('Helvetica-Bold').fontSize(18).fillColor(slate);
    document.text(data.documentTypeLabel.toUpperCase(), rightColumnX, 40, {
      width: 190,
      align: 'right',
    });
    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text(`No: ${data.documentNumber}`, rightColumnX, 66, {
      width: 190,
      align: 'right',
    });
    document.font('Helvetica').fontSize(10).fillColor(muted);
    document.text(
      `Date: ${this.formatDate(data.documentDate)}`,
      rightColumnX,
      82,
      {
        width: 190,
        align: 'right',
      },
    );

    if (data.validUntil) {
      document.text(
        `Valid Until: ${this.formatDate(data.validUntil)}`,
        rightColumnX,
        98,
        {
          width: 190,
          align: 'right',
        },
      );
    }

    const companyBlockHeight = document.heightOfString(companyLines.join('\n'), {
      width: 270,
      lineGap: 2,
    });
    const separatorY = Math.max(
      data.validUntil ? 116 : 102,
      62 + companyBlockHeight + 10,
    );

    this.drawSeparator(document, separatorY, blue, margin, contentWidth);

    const partyBlockY = separatorY + 14;
    this.drawPartyBlock(document, {
      title: 'Supplier Details',
      x: margin,
      y: partyBlockY,
      width: 245,
      party: data.supplier,
    });

    const companyBankLines = company
      ? [
          `Company GSTIN: ${company.gstin}`,
          `Bank: ${company.bankName}`,
          `A/C: ${company.accountNumber}`,
          `IFSC: ${company.ifscCode}`,
        ]
      : [];

    this.drawPartyBlock(document, {
      title: 'Bill To',
      x: margin + 270,
      y: partyBlockY,
      width: 245,
      party: {
        ...data.customer,
        address: data.customer.address,
      },
      extraLines: [
        data.customer.placeOfSupply
          ? `Place Of Supply: ${data.customer.placeOfSupply}`
          : null,
        ...companyBankLines,
      ],
    });

    const leftBlockHeight = this.measurePartyBlockHeight(document, {
      party: data.supplier,
      width: 245,
    });
    const rightBlockHeight = this.measurePartyBlockHeight(document, {
      party: {
        ...data.customer,
        address: data.customer.address,
      },
      width: 245,
      extraLines: [
        data.customer.placeOfSupply
          ? `Place Of Supply: ${data.customer.placeOfSupply}`
          : null,
        ...companyBankLines,
      ],
    });
    const secondSeparatorY =
      partyBlockY + Math.max(leftBlockHeight, rightBlockHeight) + 16;

    this.drawSeparator(document, secondSeparatorY, blue, margin, contentWidth);

    let cursorY = secondSeparatorY + 14;
    cursorY = this.drawItemsTable(document, data, cursorY, margin, contentWidth);
    cursorY += 18;

    const amountWordsWidth = 290;
    const signatureBlockHeight = company?.signatureFilePath ? 78 : 50;
    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text('Authorized Signatory', margin, cursorY, {
      width: 180,
    });
    if (company?.signatureFilePath && existsSync(company.signatureFilePath)) {
      document.image(company.signatureFilePath, margin, cursorY + 14, {
        fit: [140, 56],
      });
    } else {
      document.font('Helvetica-Bold').fontSize(11).fillColor(muted);
      document.text('AUTHORIZED SIGNATORY', margin, cursorY + 24, {
        width: 180,
      });
    }

    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text('Amount in Words', margin, cursorY + signatureBlockHeight);
    document.font('Helvetica').fontSize(10).fillColor(muted);
    document.text(this.amountToWords(data.totalAmount), margin, cursorY + signatureBlockHeight + 16, {
      width: amountWordsWidth,
    });

    const totalsX = margin + contentWidth - 210;
    const totalsWidth = 210;
    const totalsBoxHeight = data.amountDue == null ? 112 : 132;
    document
      .roundedRect(totalsX, cursorY, totalsWidth, totalsBoxHeight, 8)
      .lineWidth(1)
      .strokeColor(lightBorder)
      .stroke();

    const totalRows: Array<[string, number | null | undefined]> = [
      ['TOTAL BEFORE TAX', data.totalBeforeTax],
      ['TOTAL TAX AMOUNT', data.totalTaxAmount],
      ['ROUNDED OFF', data.roundedOff],
      ['TOTAL AMOUNT', data.totalAmount],
    ];

    if (typeof data.amountDue === 'number') {
      totalRows.push(['AMOUNT DUE', data.amountDue]);
    }

    let rowY = cursorY + 12;

    totalRows.forEach(([label, value], index) => {
      const isFinalRow = index === totalRows.length - 1;
      document
        .font(isFinalRow ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(slate);
      document.text(label, totalsX + 12, rowY, { width: 108 });
      document.text(this.formatMoney(value ?? 0), totalsX + 122, rowY, {
        width: 76,
        align: 'right',
      });
      rowY += 20;
    });

    const notesY = cursorY + Math.max(signatureBlockHeight + 82, totalsBoxHeight + 16);
    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text('Notes', margin, notesY);
    document.font('Helvetica').fontSize(9).fillColor(muted);
    document.text(data.notes?.trim() || 'No notes added.', margin, notesY + 14, {
      width: 300,
    });

    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text('Terms & Conditions', margin, notesY + 58);
    document.font('Helvetica').fontSize(9).fillColor(muted);
    document.text(
      data.termsAndConditions?.trim() || 'Standard service and payment terms apply.',
      margin,
      notesY + 72,
      {
        width: 300,
      },
    );

    const footerY = document.page.height - 56;
    this.drawSeparator(document, footerY - 8, blue, margin, contentWidth);
    document.font('Helvetica').fontSize(8).fillColor(muted);
    document.text(
      'Generated by Field Technician Tracker Billing Desk. This document is system generated.',
      margin,
      footerY,
      {
        width: contentWidth,
        align: 'center',
      },
    );
  }

  private drawItemsTable(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    startY: number,
    margin: number,
    contentWidth: number,
  ): number {
    const blue = '#1d4ed8';
    const slate = '#0f172a';
    const muted = '#475569';
    const lightBorder = '#cbd5e1';
    const columns = [
      { label: 'NO', width: 28, align: 'center' as const },
      { label: 'PRODUCT / SERVICE NAME', width: 158, align: 'left' as const },
      { label: 'HSN/SAC', width: 64, align: 'left' as const },
      { label: 'QTY', width: 40, align: 'right' as const },
      { label: 'UNIT PRICE', width: 72, align: 'right' as const },
      { label: 'CGST', width: 64, align: 'right' as const },
      { label: 'SGST', width: 64, align: 'right' as const },
      { label: 'AMOUNT', width: 74, align: 'right' as const },
    ];

    let x = margin;

    document.rect(margin, startY, contentWidth, 22).fill(blue);
    document.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    columns.forEach((column) => {
      document.text(column.label, x + 4, startY + 7, {
        width: column.width - 8,
        align: column.align,
      });
      x += column.width;
    });

    let cursorY = startY + 22;
    document.fillColor(slate);

    data.lineItems.forEach((lineItem, index) => {
      const rowHeight = Math.max(
        34,
        document.heightOfString(
          `${lineItem.productServiceName}\n${lineItem.description ?? ''}`,
          {
            width: 150,
          },
        ) + 10,
      );

      document
        .rect(margin, cursorY, contentWidth, rowHeight)
        .lineWidth(0.5)
        .strokeColor(lightBorder)
        .stroke();

      let cellX = margin;
      document.font('Helvetica').fontSize(8).fillColor(slate);
      document.text(String(index + 1), cellX + 4, cursorY + 8, {
        width: columns[0].width - 8,
        align: 'center',
      });
      cellX += columns[0].width;

      document.font('Helvetica-Bold').fontSize(8).fillColor(slate);
      document.text(lineItem.productServiceName, cellX + 4, cursorY + 7, {
        width: columns[1].width - 8,
      });
      document.font('Helvetica').fontSize(7.5).fillColor(muted);
      document.text(lineItem.description ?? '-', cellX + 4, cursorY + 18, {
        width: columns[1].width - 8,
      });
      cellX += columns[1].width;

      document.font('Helvetica').fontSize(8).fillColor(slate);
      document.text(lineItem.hsnSac || '-', cellX + 4, cursorY + 8, {
        width: columns[2].width - 8,
      });
      cellX += columns[2].width;

      document.text(this.formatNumber(lineItem.quantity), cellX + 4, cursorY + 8, {
        width: columns[3].width - 8,
        align: 'right',
      });
      cellX += columns[3].width;

      document.text(this.formatMoney(lineItem.unitPrice), cellX + 4, cursorY + 8, {
        width: columns[4].width - 8,
        align: 'right',
      });
      cellX += columns[4].width;

      document.text(
        `${this.formatPercent(lineItem.cgstPercentage)}\n${this.formatMoney(lineItem.cgstAmount)}`,
        cellX + 4,
        cursorY + 6,
        {
          width: columns[5].width - 8,
          align: 'right',
        },
      );
      cellX += columns[5].width;

      document.text(
        `${this.formatPercent(lineItem.sgstPercentage)}\n${this.formatMoney(lineItem.sgstAmount)}`,
        cellX + 4,
        cursorY + 6,
        {
          width: columns[6].width - 8,
          align: 'right',
        },
      );
      cellX += columns[6].width;

      document.font('Helvetica-Bold').fontSize(8).fillColor(slate);
      document.text(this.formatMoney(lineItem.lineAmount), cellX + 4, cursorY + 8, {
        width: columns[7].width - 8,
        align: 'right',
      });

      cursorY += rowHeight;
    });

    document
      .rect(margin, cursorY, contentWidth, 20)
      .lineWidth(0.5)
      .strokeColor(lightBorder)
      .stroke();
    document.font('Helvetica-Bold').fontSize(8).fillColor(slate);
    document.text('Tax Summary', margin + 6, cursorY + 6, {
      width: 140,
    });
    document.font('Helvetica').fontSize(8);
    document.text(
      `CGST ${this.formatPercent(this.aggregatePercent(data.lineItems, 'cgstPercentage'))} | SGST ${this.formatPercent(this.aggregatePercent(data.lineItems, 'sgstPercentage'))}`,
      margin + 152,
      cursorY + 6,
      {
        width: contentWidth - 158,
        align: 'right',
      },
    );

    return cursorY + 20;
  }

  private drawPartyBlock(
    document: PDFKit.PDFDocument,
    options: {
      title: string;
      x: number;
      y: number;
      width: number;
      party: BillingParty;
      extraLines?: Array<string | null | undefined>;
    },
  ): void {
    const slate = '#0f172a';
    const muted = '#475569';

    document.font('Helvetica-Bold').fontSize(10).fillColor(slate);
    document.text(options.title, options.x, options.y, {
      width: options.width,
    });

    const lines = [
      options.party.name,
      options.party.address,
      options.party.phone ? `Phone: ${options.party.phone}` : null,
      options.party.email ? `Email: ${options.party.email}` : null,
      options.party.gstin ? `GSTIN: ${options.party.gstin}` : null,
      options.party.bankName ? `Bank: ${options.party.bankName}` : null,
      options.party.accountNumber
        ? `A/C: ${options.party.accountNumber}`
        : null,
      options.party.ifscCode ? `IFSC: ${options.party.ifscCode}` : null,
      ...(options.extraLines ?? []),
    ].filter(Boolean) as string[];

    document.font('Helvetica').fontSize(9).fillColor(muted);
    document.text(lines.join('\n'), options.x, options.y + 16, {
      width: options.width,
      lineGap: 2,
    });
  }

  private measurePartyBlockHeight(
    document: PDFKit.PDFDocument,
    options: {
      width: number;
      party: BillingParty;
      extraLines?: Array<string | null | undefined>;
    },
  ): number {
    const lines = [
      options.party.name,
      options.party.address,
      options.party.phone ? `Phone: ${options.party.phone}` : null,
      options.party.email ? `Email: ${options.party.email}` : null,
      options.party.gstin ? `GSTIN: ${options.party.gstin}` : null,
      options.party.bankName ? `Bank: ${options.party.bankName}` : null,
      options.party.accountNumber
        ? `A/C: ${options.party.accountNumber}`
        : null,
      options.party.ifscCode ? `IFSC: ${options.party.ifscCode}` : null,
      ...(options.extraLines ?? []),
    ].filter(Boolean) as string[];

    return (
      16 +
      document.heightOfString(lines.join('\n'), {
        width: options.width,
        lineGap: 2,
      })
    );
  }

  private drawSeparator(
    document: PDFKit.PDFDocument,
    y: number,
    color: string,
    x: number,
    width: number,
  ): void {
    document
      .moveTo(x, y)
      .lineTo(x + width, y)
      .lineWidth(1.4)
      .strokeColor(color)
      .stroke();
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatPercent(value: number): string {
    return `${this.formatNumber(value)}%`;
  }

  private aggregatePercent(
    lineItems: BillingLineItem[],
    field: 'cgstPercentage' | 'sgstPercentage',
  ): number {
    return lineItems.reduce((maxValue, item) => Math.max(maxValue, item[field]), 0);
  }

  private amountToWords(amount: number): string {
    const absoluteAmount = Math.abs(amount);
    const rupees = Math.floor(absoluteAmount);
    const paise = Math.round((absoluteAmount - rupees) * 100);
    const rupeeWords = this.numberToWords(rupees);
    const paiseWords =
      paise > 0 ? ` and ${this.numberToWords(paise)} Paise` : '';

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
