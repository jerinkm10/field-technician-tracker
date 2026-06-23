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
  sealAttachment?: string | null;
  logoFilePath?: string | null;
  signatureFilePath?: string | null;
  sealFilePath?: string | null;
};

type FooterIssuer = {
  companyName: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  logoFilePath?: string | null;
  signatureFilePath?: string | null;
  sealFilePath?: string | null;
};

type IconType = 'address' | 'phone' | 'email' | 'info' | 'person';

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

const BRAND_COLOR = '#3D6B86';
const BORDER_COLOR = '#3D6B86';
const ICON_COLOR = '#3D6B86';
const BODY_TEXT = '#111111';
const MUTED_TEXT = '#8B9198';
const COLUMN_TINT = '#F1F1F1';

@Injectable()
export class BillingDocumentsService {
  async buildPdfBuffer(data: BillingDocumentPdfData): Promise<Buffer> {
    const document = new PDFDocument({
      margin: 28,
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
    const margin = 28;
    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const contentWidth = pageWidth - margin * 2;
    const issuer = this.resolveIssuer(data);
    const heading = this.resolveDocumentHeading(data.documentTypeLabel);

    document.font('Helvetica').fillColor(BODY_TEXT);

    const headerBottomY = this.drawHeader(
      document,
      margin,
      contentWidth,
      issuer,
      heading,
      data,
    );

    const firstDividerY = headerBottomY + 10;
    this.drawDivider(document, margin, contentWidth, firstDividerY);

    const detailsY = firstDividerY + 16;
    const detailsGap = 22;
    const leftWidth = 255;
    const rightWidth = contentWidth - leftWidth - detailsGap;
    const rightX = margin + leftWidth + detailsGap;

    const leftBottom = this.drawIssuerDetails(
      document,
      margin,
      detailsY,
      leftWidth,
      issuer,
    );
    const rightBottom = this.drawBillToDetails(
      document,
      rightX,
      detailsY,
      rightWidth,
      data,
    );

    const secondDividerY = Math.max(leftBottom, rightBottom) + 18;
    this.drawDivider(document, margin, contentWidth, secondDividerY);

    const tableStartY = secondDividerY + 14;
    const tableBottomY = this.drawItemsTable(
      document,
      data,
      margin,
      contentWidth,
      tableStartY,
    );

    const footerStartY = tableBottomY + 22;
    this.drawFooter(
      document,
      data,
      issuer,
      margin,
      contentWidth,
      footerStartY,
      pageHeight,
    );
  }

  private drawHeader(
    document: PDFKit.PDFDocument,
    margin: number,
    contentWidth: number,
    issuer: FooterIssuer,
    heading: string,
    data: BillingDocumentPdfData,
  ): number {
    const metaWidth = 245;
    const leftWidth = contentWidth - metaWidth - 24;
    const metaX = margin + contentWidth - metaWidth;
    const topY = 26;
    const hasLogo = Boolean(
      issuer.logoFilePath && existsSync(issuer.logoFilePath),
    );

    if (hasLogo && issuer.logoFilePath) {
      document.image(issuer.logoFilePath, margin, topY, {
        fit: [leftWidth, 92],
      });
    } else {
      document
        .font('Helvetica-BoldOblique')
        .fontSize(28)
        .fillColor(BRAND_COLOR)
        .text(issuer.companyName, margin, topY + 20, {
          width: leftWidth,
        });
    }

    document
      .font('Helvetica')
      .fontSize(14)
      .fillColor(BODY_TEXT)
      .text('Original for Recipient', metaX, topY + 2, {
        width: metaWidth,
        align: 'right',
      });

    document
      .font('Helvetica-Bold')
      .fontSize(29)
      .fillColor(BRAND_COLOR)
      .text(`${heading} ${data.documentNumber || 'Draft'}`, metaX, topY + 30, {
        width: metaWidth,
        align: 'right',
      });

    document
      .font('Helvetica-Bold')
      .fontSize(12.5)
      .fillColor(BODY_TEXT)
      .text('Date', metaX, topY + 74, {
        width: 36,
        align: 'right',
      });
    document
      .font('Helvetica')
      .fontSize(12.5)
      .fillColor(BODY_TEXT)
      .text(` ${this.formatDateLong(data.documentDate)}`, metaX + 36, topY + 74, {
        width: metaWidth - 36,
        align: 'right',
      });

    if (data.validUntil) {
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor(MUTED_TEXT)
        .text(`Valid Until ${this.formatDateLong(data.validUntil)}`, metaX, topY + 93, {
          width: metaWidth,
          align: 'right',
        });
      return topY + 110;
    }

    return topY + 104;
  }

  private drawIssuerDetails(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    issuer: FooterIssuer,
  ): number {
    document
      .font('Helvetica-BoldOblique')
      .fontSize(18)
      .fillColor(BRAND_COLOR)
      .text(issuer.companyName, x, y, {
        width,
      });

    let cursorY = y + 28;

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY,
      width,
      icon: 'address',
      lines: this.buildIssuerAddressLines(issuer),
    });

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + 8,
      width,
      icon: 'phone',
      lines: [issuer.phone || '-'],
    });

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + 8,
      width,
      icon: 'email',
      lines: [issuer.email || '-'],
    });

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + 8,
      width,
      icon: 'info',
      lines: this.buildIssuerInfoLines(issuer),
    });

    return cursorY;
  }

  private drawBillToDetails(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    data: BillingDocumentPdfData,
  ): number {
    document
      .font('Helvetica-BoldOblique')
      .fontSize(18)
      .fillColor(BRAND_COLOR)
      .text('Bill to:', x, y, {
        width,
      });

    let cursorY = y + 28;

    document
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(BODY_TEXT)
      .text(this.resolveCustomerName(data), x, cursorY, {
        width,
      });

    cursorY += 18;

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY,
      width,
      icon: 'address',
      lines: [
        this.resolveCustomerBranch(data),
        this.resolveCustomerAddress(data),
      ],
    });

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + 8,
      width,
      icon: 'person',
      lines: [this.resolveCustomerContact(data)],
    });

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + 8,
      width,
      icon: 'info',
      lines: [
        `Place of Supply: ${data.customer.placeOfSupply || '-'}`,
        `GSTIN: ${data.customer.gstin || '-'}`,
      ],
    });

    return cursorY;
  }

  private drawItemsTable(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    margin: number,
    contentWidth: number,
    startY: number,
  ): number {
    const columns = [
      { label: 'NO', width: 26, align: 'center' as const },
      { label: 'PRODUCT / SERVICE NAME', width: 166, align: 'left' as const },
      { label: 'HSN/SAC', width: 52, align: 'center' as const },
      { label: 'QTY', width: 44, align: 'center' as const },
      { label: 'UNIT PRICE', width: 72, align: 'right' as const },
      { label: 'CGST', width: 58, align: 'right' as const },
      { label: 'SGST', width: 58, align: 'right' as const },
      { label: 'AMOUNT', width: 59, align: 'right' as const },
    ];

    const xPositions: number[] = [margin];
    columns.forEach((column, index) => {
      xPositions[index + 1] = xPositions[index] + column.width;
    });

    let cursorY = startY;

    this.strokeHorizontalRule(document, margin, margin + contentWidth, cursorY, 1.2);

    document
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(BRAND_COLOR);

    columns.forEach((column, index) => {
      document.text(column.label, xPositions[index] + 4, cursorY + 10, {
        width: column.width - 8,
        align: column.align,
      });
    });

    cursorY += 30;
    this.strokeHorizontalRule(document, margin, margin + contentWidth, cursorY, 1);

    data.lineItems.forEach((lineItem, index) => {
      const productCopy = (lineItem.productServiceName || 'UNTITLED ITEM').toUpperCase();
      const descriptionCopy = (lineItem.description || '').trim();
      const descriptionHeight = document.heightOfString(descriptionCopy || '-', {
        width: columns[1].width - 12,
        lineGap: 2,
      });
      const rowHeight = Math.max(72, 24 + descriptionHeight + 16);

      this.fillTintedColumns(document, cursorY, rowHeight, xPositions, columns);
      this.strokeHorizontalRule(
        document,
        margin,
        margin + contentWidth,
        cursorY + rowHeight,
        0.9,
      );

      document
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(BODY_TEXT)
        .text(String(index + 1), xPositions[0] + 3, cursorY + 14, {
          width: columns[0].width - 6,
          align: 'center',
        });

      document
        .font('Helvetica-Bold')
        .fontSize(8.4)
        .fillColor(BODY_TEXT)
        .text(productCopy, xPositions[1] + 6, cursorY + 13, {
          width: columns[1].width - 12,
        });

      document
        .font('Helvetica')
        .fontSize(7.4)
        .fillColor(BODY_TEXT)
        .text(descriptionCopy || '-', xPositions[1] + 6, cursorY + 36, {
          width: columns[1].width - 12,
          lineGap: 2,
        });

      document
        .font('Helvetica-Bold')
        .fontSize(8.7)
        .fillColor(BODY_TEXT)
        .text(lineItem.hsnSac || '-', xPositions[2] + 4, cursorY + 14, {
          width: columns[2].width - 8,
          align: 'center',
        });

      document.text(this.formatNumber(lineItem.quantity), xPositions[3] + 4, cursorY + 14, {
        width: columns[3].width - 8,
        align: 'center',
      });

      document.text(this.formatMoney(lineItem.unitPrice), xPositions[4] + 4, cursorY + 14, {
        width: columns[4].width - 8,
        align: 'right',
      });

      this.drawTaxCell(
        document,
        xPositions[5],
        cursorY,
        columns[5].width,
        lineItem.cgstAmount,
        lineItem.cgstPercentage,
      );
      this.drawTaxCell(
        document,
        xPositions[6],
        cursorY,
        columns[6].width,
        lineItem.sgstAmount,
        lineItem.sgstPercentage,
      );

      document
        .font('Helvetica-Bold')
        .fontSize(10.3)
        .fillColor(BODY_TEXT)
        .text(this.formatMoney(lineItem.lineAmount), xPositions[7] + 4, cursorY + 14, {
          width: columns[7].width - 8,
          align: 'right',
        });

      cursorY += rowHeight;
    });

    const taxSummaryHeight = 32;
    const totalRowHeight = 28;

    this.fillTintedColumns(document, cursorY, taxSummaryHeight, xPositions, columns);
    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(BODY_TEXT)
      .text(`@${this.formatNumber(this.aggregateTaxRate(data.lineItems))}%`, xPositions[2] + 4, cursorY + 9, {
        width: columns[2].width - 8,
        align: 'center',
      });
    document.text(this.formatNumber(this.totalQuantity(data.lineItems)), xPositions[3] + 4, cursorY + 9, {
      width: columns[3].width - 8,
      align: 'center',
    });
    document.text(this.formatMoney(data.totalBeforeTax), xPositions[4] + 4, cursorY + 9, {
      width: columns[4].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(this.totalTaxSide(data.lineItems, 'cgstAmount')), xPositions[5] + 4, cursorY + 9, {
      width: columns[5].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(this.totalTaxSide(data.lineItems, 'sgstAmount')), xPositions[6] + 4, cursorY + 9, {
      width: columns[6].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(data.totalAmount), xPositions[7] + 4, cursorY + 9, {
      width: columns[7].width - 8,
      align: 'right',
    });

    cursorY += taxSummaryHeight;

    this.fillTintedColumns(document, cursorY, totalRowHeight, xPositions, columns);
    document
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(BRAND_COLOR)
      .text('TOTAL', xPositions[1] + 6, cursorY + 7, {
        width: columns[1].width - 12,
        align: 'center',
      });
    document.text(this.formatNumber(this.totalQuantity(data.lineItems)), xPositions[3] + 4, cursorY + 7, {
      width: columns[3].width - 8,
      align: 'center',
    });
    document.text(this.formatMoney(data.totalBeforeTax), xPositions[4] + 4, cursorY + 7, {
      width: columns[4].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(this.totalTaxSide(data.lineItems, 'cgstAmount')), xPositions[5] + 4, cursorY + 7, {
      width: columns[5].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(this.totalTaxSide(data.lineItems, 'sgstAmount')), xPositions[6] + 4, cursorY + 7, {
      width: columns[6].width - 8,
      align: 'right',
    });
    document.text(this.formatMoney(data.totalAmount), xPositions[7] + 4, cursorY + 7, {
      width: columns[7].width - 8,
      align: 'right',
    });

    cursorY += totalRowHeight;
    this.strokeHorizontalRule(document, margin, margin + contentWidth, cursorY, 1.2);

    return cursorY;
  }

  private drawFooter(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    issuer: FooterIssuer,
    margin: number,
    contentWidth: number,
    startY: number,
    pageHeight: number,
  ): void {
    const leftWidth = 300;
    const rightWidth = 195;
    const rightX = margin + contentWidth - rightWidth;

    document
      .font('Helvetica')
      .fontSize(11)
      .fillColor(BODY_TEXT)
      .text(`Total: Rs. ${this.amountToWords(data.totalAmount)}`, margin, startY, {
        width: leftWidth,
      });

    document
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .fillColor(BRAND_COLOR)
      .text('AUTHORIZED SIGNATORY', margin, startY + 24, {
        width: leftWidth,
      });

    this.drawSignatureAssets(document, margin, startY + 44, issuer);

    this.drawTotalsSummary(document, data, rightX, startY, rightWidth);

    document
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#A0A4AA')
      .text('Issued using ERP System', margin, pageHeight - 30, {
        width: contentWidth,
        align: 'right',
      });
  }

  private drawSignatureAssets(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    issuer: FooterIssuer,
  ): void {
    let currentX = x;

    if (issuer.signatureFilePath && existsSync(issuer.signatureFilePath)) {
      document.image(issuer.signatureFilePath, currentX, y, {
        fit: [118, 82],
      });
      currentX += 126;
    }

    if (issuer.sealFilePath && existsSync(issuer.sealFilePath)) {
      document.image(issuer.sealFilePath, currentX, y - 6, {
        fit: [96, 96],
      });
      currentX += 102;
    }

    if (
      (!issuer.signatureFilePath || !existsSync(issuer.signatureFilePath)) &&
      (!issuer.sealFilePath || !existsSync(issuer.sealFilePath))
    ) {
      document
        .moveTo(x, y + 46)
        .lineTo(x + 132, y + 46)
        .lineWidth(0.8)
        .strokeColor(BORDER_COLOR)
        .stroke();
    }
  }

  private drawTotalsSummary(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    x: number,
    y: number,
    width: number,
  ): void {
    const rows: Array<[string, number | null | undefined, boolean]> = [
      ['TOTAL BEFORE TAX', data.totalBeforeTax, true],
      ['TOTAL TAX AMOUNT', data.totalTaxAmount, true],
      ['ROUNDED OFF', data.roundedOff, false],
      ['TOTAL AMOUNT', data.totalAmount, true],
      ['AMOUNT DUE', data.amountDue, true],
    ];

    let cursorY = y;

    rows.forEach(([label, value, useCurrency]) => {
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(BRAND_COLOR)
        .text(label, x, cursorY, {
          width: width - 86,
          align: 'right',
        });

      document.text(
        useCurrency ? this.formatCurrency(value ?? 0) : this.formatMoney(value ?? 0),
        x + width - 86,
        cursorY,
        {
          width: 86,
          align: 'right',
        },
      );

      cursorY += 20;
    });
  }

  private drawTaxCell(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    amount: number,
    percentage: number,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(BODY_TEXT)
      .text(this.formatMoney(amount), x + 4, y + 12, {
        width: width - 8,
        align: 'right',
      });

    document
      .font('Helvetica')
      .fontSize(8.2)
      .fillColor(BODY_TEXT)
      .text(`${this.formatNumber(percentage)}%`, x + 4, y + 30, {
        width: width - 8,
        align: 'right',
      });
  }

  private drawIconTextBlock(
    document: PDFKit.PDFDocument,
    options: {
      x: number;
      y: number;
      width: number;
      icon: IconType;
      lines: string[];
    },
  ): number {
    const validLines = options.lines.filter(
      (line) => typeof line === 'string' && line.trim().length > 0,
    );

    if (!validLines.length) {
      return options.y;
    }

    const iconX = options.x;
    const textX = iconX + 20;
    const textWidth = options.width - 20;
    document.font('Helvetica').fontSize(9).fillColor(BODY_TEXT);
    const blockHeight = document.heightOfString(validLines.join('\n'), {
      width: textWidth,
      lineGap: 2,
    });

    this.drawIcon(document, options.icon, iconX + 1, options.y + 3);

    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BODY_TEXT)
      .text(validLines.join('\n'), textX, options.y, {
        width: textWidth,
        lineGap: 2,
      });

    return options.y + blockHeight;
  }

  private drawIcon(
    document: PDFKit.PDFDocument,
    icon: IconType,
    x: number,
    y: number,
  ): void {
    document.save();
    document.lineWidth(1).strokeColor(ICON_COLOR).fillColor(ICON_COLOR);

    switch (icon) {
      case 'address':
        document
          .moveTo(x + 1, y + 7)
          .lineTo(x + 6, y + 2)
          .lineTo(x + 11, y + 7)
          .moveTo(x + 2.5, y + 7)
          .lineTo(x + 2.5, y + 12)
          .lineTo(x + 9.5, y + 12)
          .lineTo(x + 9.5, y + 7)
          .stroke();
        break;
      case 'phone':
        document
          .moveTo(x + 2, y + 4)
          .lineTo(x + 4, y + 2)
          .lineTo(x + 5.2, y + 3.2)
          .lineTo(x + 4.2, y + 4.4)
          .lineTo(x + 7.6, y + 7.8)
          .lineTo(x + 8.8, y + 6.8)
          .lineTo(x + 10, y + 8)
          .lineTo(x + 8, y + 10)
          .lineTo(x + 6.8, y + 8.8)
          .lineTo(x + 7.8, y + 7.8)
          .lineTo(x + 4.4, y + 4.4)
          .lineTo(x + 3.2, y + 5.4)
          .closePath()
          .stroke();
        break;
      case 'email':
        document.rect(x + 1, y + 3, 11, 8).stroke();
        document
          .moveTo(x + 1, y + 3)
          .lineTo(x + 6.5, y + 7)
          .lineTo(x + 12, y + 3)
          .stroke();
        break;
      case 'person':
        document.circle(x + 6.5, y + 4, 2.2).stroke();
        document
          .moveTo(x + 2.5, y + 11)
          .quadraticCurveTo(x + 6.5, y + 7.5, x + 10.5, y + 11)
          .stroke();
        break;
      case 'info':
      default:
        document.circle(x + 6.5, y + 7, 5.4).stroke();
        document
          .font('Helvetica-Bold')
          .fontSize(8.4)
          .fillColor(ICON_COLOR)
          .text('i', x + 4.9, y + 2.1, {
            width: 4,
            align: 'center',
          });
        break;
    }

    document.restore();
  }

  private drawDivider(
    document: PDFKit.PDFDocument,
    x: number,
    width: number,
    y: number,
  ): void {
    this.strokeHorizontalRule(document, x, x + width, y, 1);
  }

  private strokeHorizontalRule(
    document: PDFKit.PDFDocument,
    x1: number,
    x2: number,
    y: number,
    lineWidth: number,
  ): void {
    document
      .moveTo(x1, y)
      .lineTo(x2, y)
      .lineWidth(lineWidth)
      .strokeColor(BORDER_COLOR)
      .stroke();
  }

  private fillTintedColumns(
    document: PDFKit.PDFDocument,
    y: number,
    height: number,
    xPositions: number[],
    columns: Array<{ width: number }>,
  ): void {
    [0, 2, 4, 6].forEach((columnIndex) => {
      document
        .rect(xPositions[columnIndex], y, columns[columnIndex].width, height)
        .fill(COLUMN_TINT);
    });
    document.fillColor(BODY_TEXT);
  }

  private resolveIssuer(data: BillingDocumentPdfData): FooterIssuer {
    if (data.company) {
      return {
        companyName: data.company.companyName,
        phone: data.company.phone,
        email: data.company.email,
        gstin: data.company.gstin,
        address: data.company.address,
        city: data.company.city,
        state: data.company.state,
        pinCode: data.company.pinCode,
        country: data.company.country,
        bankName: data.company.bankName,
        accountNumber: data.company.accountNumber,
        ifscCode: data.company.ifscCode,
        logoFilePath: data.company.logoFilePath,
        signatureFilePath: data.company.signatureFilePath,
        sealFilePath: data.company.sealFilePath,
      };
    }

    return {
      companyName: data.supplier.name,
      phone: data.supplier.phone,
      email: data.supplier.email,
      gstin: data.supplier.gstin,
      address: data.supplier.address,
      bankName: data.supplier.bankName,
      accountNumber: data.supplier.accountNumber,
      ifscCode: data.supplier.ifscCode,
    };
  }

  private buildIssuerAddressLines(issuer: FooterIssuer): string[] {
    const locality = [issuer.city, issuer.state]
      .filter(Boolean)
      .join(', ');
    const localityWithPin = [locality, issuer.pinCode].filter(Boolean).join(' ');

    return [
      issuer.address || '-',
      localityWithPin,
      issuer.country || '',
    ];
  }

  private buildIssuerInfoLines(issuer: FooterIssuer): string[] {
    return [
      issuer.bankName || '-',
      issuer.accountNumber ? `A/C No: ${issuer.accountNumber}` : '',
      issuer.ifscCode ? `IFSC: ${issuer.ifscCode}` : '',
      issuer.gstin ? `GSTIN: ${issuer.gstin}` : '',
    ];
  }

  private resolveCustomerName(data: BillingDocumentPdfData): string {
    return data.customer.name || 'Customer';
  }

  private resolveCustomerBranch(data: BillingDocumentPdfData): string {
    return data.customer.name || data.customer.address || 'Customer Branch';
  }

  private resolveCustomerAddress(data: BillingDocumentPdfData): string {
    return data.customer.address || '-';
  }

  private resolveCustomerContact(data: BillingDocumentPdfData): string {
    return (
      data.customer.phone ||
      data.customer.email ||
      data.customer.name ||
      'Contact Person'
    );
  }

  private resolveDocumentHeading(documentTypeLabel: string): string {
    const normalized = documentTypeLabel.toUpperCase();

    if (normalized.includes('QUOTATION')) {
      return 'QUOTATION';
    }

    if (normalized.includes('PROFORMA')) {
      return 'PROFORMA INVOICE';
    }

    return 'INVOICE';
  }

  private formatDateLong(value: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    }).format(value);
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatCurrency(value: number): string {
    return `Rs. ${this.formatMoney(value)}`;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private aggregateTaxRate(lineItems: BillingLineItem[]): number {
    return (
      this.aggregatePercent(lineItems, 'cgstPercentage') +
      this.aggregatePercent(lineItems, 'sgstPercentage')
    );
  }

  private aggregatePercent(
    lineItems: BillingLineItem[],
    field: 'cgstPercentage' | 'sgstPercentage',
  ): number {
    return lineItems.reduce(
      (maxValue, item) => Math.max(maxValue, item[field]),
      0,
    );
  }

  private totalQuantity(lineItems: BillingLineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  private totalTaxSide(
    lineItems: BillingLineItem[],
    field: 'cgstAmount' | 'sgstAmount',
  ): number {
    return lineItems.reduce((sum, item) => sum + item[field], 0);
  }

  private amountToWords(amount: number): string {
    const absoluteAmount = Math.abs(amount);
    const rupees = Math.floor(absoluteAmount);
    const paise = Math.round((absoluteAmount - rupees) * 100);
    const rupeeWords = this.numberToWords(rupees);
    const paiseWords =
      paise > 0 ? ` and ${this.numberToWords(paise)} Paise` : '';

    return `${rupeeWords}${paiseWords} Only`;
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

    const toWords = (amountValue: number): string => {
      if (amountValue < 20) {
        return belowTwenty[amountValue];
      }

      if (amountValue < 100) {
        return `${tens[Math.floor(amountValue / 10)]}${amountValue % 10 ? ` ${belowTwenty[amountValue % 10]}` : ''}`;
      }

      if (amountValue < 1000) {
        return `${belowTwenty[Math.floor(amountValue / 100)]} Hundred${amountValue % 100 ? ` ${toWords(amountValue % 100)}` : ''}`;
      }

      if (amountValue < 100000) {
        return `${toWords(Math.floor(amountValue / 1000))} Thousand${amountValue % 1000 ? ` ${toWords(amountValue % 1000)}` : ''}`;
      }

      if (amountValue < 10000000) {
        return `${toWords(Math.floor(amountValue / 100000))} Lakh${amountValue % 100000 ? ` ${toWords(amountValue % 100000)}` : ''}`;
      }

      return `${toWords(Math.floor(amountValue / 10000000))} Crore${amountValue % 10000000 ? ` ${toWords(amountValue % 10000000)}` : ''}`;
    };

    return toWords(value).trim();
  }
}
