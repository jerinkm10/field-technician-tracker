import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
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

type HeaderVariant = {
  showRecipientCopy: boolean;
  typeLabel: string | null;
};

type TableColumn = {
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
};

type LayoutConfig = {
  margin: number;
  topPadding: number;
  headerGap: number;
  metaWidth: number;
  logoMaxWidth: number;
  logoMaxHeight: number;
  brandFallbackSize: number;
  metaLabelSize: number;
  documentNumberSize: number;
  dateSize: number;
  detailGap: number;
  detailColumnGap: number;
  detailHeadingSize: number;
  detailFontSize: number;
  detailLineGap: number;
  detailBlockGap: number;
  customerNameSize: number;
  tableHeaderFontSize: number;
  tableBodyFontSize: number;
  tableDescriptionFontSize: number;
  tableTaxPercentSize: number;
  tableCellPaddingX: number;
  tableCellPaddingTop: number;
  tableCellPaddingBottom: number;
  tableHeaderHeight: number;
  minRowHeight: number;
  summaryRowHeight: number;
  totalRowHeight: number;
  footerTopGap: number;
  amountWordsSize: number;
  signatoryLabelSize: number;
  signatureHeight: number;
  sealHeight: number;
  totalsFontSize: number;
  totalsValueWidth: number;
  totalsRowGap: number;
  footerTextSize: number;
  footerBottomGap: number;
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

const BRAND_COLOR = '#3D6B86';
const BORDER_COLOR = '#3D6B86';
const ICON_COLOR = '#3D6B86';
const BODY_TEXT = '#111111';
const LIGHT_TEXT = '#9AA0A6';
const ALT_ROW = '#F6F9FB';
const SUMMARY_FILL = '#F2F5F8';

const LAYOUT_PRESETS: LayoutConfig[] = [
  {
    margin: 18,
    topPadding: 16,
    headerGap: 10,
    metaWidth: 198,
    logoMaxWidth: 240,
    logoMaxHeight: 80,
    brandFallbackSize: 24,
    metaLabelSize: 12,
    documentNumberSize: 24,
    dateSize: 10.8,
    detailGap: 10,
    detailColumnGap: 20,
    detailHeadingSize: 15,
    detailFontSize: 8.2,
    detailLineGap: 1.2,
    detailBlockGap: 4,
    customerNameSize: 11.8,
    tableHeaderFontSize: 8,
    tableBodyFontSize: 7.6,
    tableDescriptionFontSize: 7.2,
    tableTaxPercentSize: 6.8,
    tableCellPaddingX: 4,
    tableCellPaddingTop: 5,
    tableCellPaddingBottom: 4,
    tableHeaderHeight: 24,
    minRowHeight: 42,
    summaryRowHeight: 22,
    totalRowHeight: 20,
    footerTopGap: 12,
    amountWordsSize: 8.6,
    signatoryLabelSize: 9,
    signatureHeight: 58,
    sealHeight: 58,
    totalsFontSize: 8.7,
    totalsValueWidth: 88,
    totalsRowGap: 14,
    footerTextSize: 7.4,
    footerBottomGap: 12,
  },
  {
    margin: 14,
    topPadding: 12,
    headerGap: 8,
    metaWidth: 188,
    logoMaxWidth: 220,
    logoMaxHeight: 70,
    brandFallbackSize: 22,
    metaLabelSize: 11,
    documentNumberSize: 22,
    dateSize: 10,
    detailGap: 8,
    detailColumnGap: 16,
    detailHeadingSize: 14.2,
    detailFontSize: 7.7,
    detailLineGap: 1,
    detailBlockGap: 3,
    customerNameSize: 11.2,
    tableHeaderFontSize: 7.5,
    tableBodyFontSize: 7.1,
    tableDescriptionFontSize: 6.7,
    tableTaxPercentSize: 6.4,
    tableCellPaddingX: 3.5,
    tableCellPaddingTop: 4,
    tableCellPaddingBottom: 3.5,
    tableHeaderHeight: 22,
    minRowHeight: 36,
    summaryRowHeight: 20,
    totalRowHeight: 18,
    footerTopGap: 10,
    amountWordsSize: 8.1,
    signatoryLabelSize: 8.6,
    signatureHeight: 52,
    sealHeight: 52,
    totalsFontSize: 8.1,
    totalsValueWidth: 84,
    totalsRowGap: 12,
    footerTextSize: 7,
    footerBottomGap: 10,
  },
  {
    margin: 12,
    topPadding: 10,
    headerGap: 6,
    metaWidth: 180,
    logoMaxWidth: 210,
    logoMaxHeight: 62,
    brandFallbackSize: 20,
    metaLabelSize: 10.2,
    documentNumberSize: 20,
    dateSize: 9.2,
    detailGap: 7,
    detailColumnGap: 14,
    detailHeadingSize: 13.6,
    detailFontSize: 7.2,
    detailLineGap: 0.8,
    detailBlockGap: 2.5,
    customerNameSize: 10.6,
    tableHeaderFontSize: 7.1,
    tableBodyFontSize: 6.8,
    tableDescriptionFontSize: 6.3,
    tableTaxPercentSize: 6,
    tableCellPaddingX: 3,
    tableCellPaddingTop: 3.5,
    tableCellPaddingBottom: 3,
    tableHeaderHeight: 20,
    minRowHeight: 32,
    summaryRowHeight: 18,
    totalRowHeight: 16,
    footerTopGap: 8,
    amountWordsSize: 7.7,
    signatoryLabelSize: 8.1,
    signatureHeight: 48,
    sealHeight: 48,
    totalsFontSize: 7.7,
    totalsValueWidth: 78,
    totalsRowGap: 10,
    footerTextSize: 6.8,
    footerBottomGap: 8,
  },
];

@Injectable()
export class BillingDocumentsService {
  private readonly storageRoot = resolve(process.cwd(), 'storage', 'documents');

  async buildPdfBuffer(data: BillingDocumentPdfData): Promise<Buffer> {
    const document = new PDFDocument({
      margin: 0,
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

  async readStoredPdfBuffer(
    relativePath: string | null | undefined,
  ): Promise<Buffer | null> {
    const filePath = this.resolveStoredPdfPath(relativePath);

    if (!filePath) {
      return null;
    }

    return readFile(filePath);
  }

  async storePdfBuffer(
    folderName: 'tax-invoices' | 'proforma-invoices' | 'quotations' | 'amc',
    documentNumber: string,
    pdfBuffer: Buffer,
  ): Promise<string> {
    const safeFolderName = this.sanitizePathSegment(folderName);
    const safeFileName = `${this.sanitizeFileName(documentNumber)}.pdf`;
    const directoryPath = resolve(this.storageRoot, safeFolderName);
    const filePath = resolve(directoryPath, safeFileName);

    await mkdir(directoryPath, { recursive: true });
    await writeFile(filePath, pdfBuffer);

    return `${safeFolderName}/${safeFileName}`;
  }

  private drawDocument(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
  ): void {
    const issuer = this.resolveIssuer(data);
    const headerVariant = this.resolveHeaderVariant(data.documentTypeLabel);
    const layout = this.resolveLayout(document, data, issuer, headerVariant);
    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const contentWidth = pageWidth - layout.margin * 2;
    const detailColumns = this.resolveDetailColumns(contentWidth, layout);

    document.font('Helvetica').fillColor(BODY_TEXT);

    let cursorY = layout.topPadding;

    cursorY = this.drawHeader(
      document,
      cursorY,
      pageWidth,
      issuer,
      data,
      headerVariant,
      layout,
    );

    this.drawDivider(document, layout.margin, pageWidth - layout.margin, cursorY);
    cursorY += layout.detailGap;

    const leftBottom = this.drawIssuerDetails(
      document,
      layout.margin,
      cursorY,
      detailColumns.leftWidth,
      issuer,
      layout,
    );
    const rightBottom = this.drawBillToDetails(
      document,
      layout.margin + detailColumns.leftWidth + layout.detailColumnGap,
      cursorY,
      detailColumns.rightWidth,
      data,
      layout,
    );

    cursorY = Math.max(leftBottom, rightBottom) + layout.detailGap;
    this.drawDivider(document, layout.margin, pageWidth - layout.margin, cursorY);
    cursorY += layout.detailGap;

    cursorY = this.drawItemsTable(
      document,
      data,
      layout.margin,
      contentWidth,
      cursorY,
      layout,
    );

    cursorY += layout.footerTopGap;
    this.drawFooter(
      document,
      data,
      issuer,
      layout.margin,
      contentWidth,
      cursorY,
      pageHeight,
      layout,
    );
  }

  private resolveLayout(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    issuer: FooterIssuer,
    headerVariant: HeaderVariant,
  ): LayoutConfig {
    const pageWidth = document.page.width;
    const pageHeight = document.page.height;

    for (const preset of LAYOUT_PRESETS) {
      const estimatedHeight = this.estimateDocumentHeight(
        document,
        data,
        issuer,
        headerVariant,
        preset,
        pageWidth,
        pageHeight,
      );

      if (estimatedHeight <= pageHeight - preset.footerBottomGap) {
        return preset;
      }
    }

    return LAYOUT_PRESETS[LAYOUT_PRESETS.length - 1];
  }

  private estimateDocumentHeight(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    issuer: FooterIssuer,
    headerVariant: HeaderVariant,
    layout: LayoutConfig,
    pageWidth: number,
    pageHeight: number,
  ): number {
    const contentWidth = pageWidth - layout.margin * 2;
    const detailColumns = this.resolveDetailColumns(contentWidth, layout);

    const headerHeight = this.measureHeaderHeight(
      document,
      issuer,
      data,
      headerVariant,
      contentWidth,
      layout,
    );
    const detailsHeight = Math.max(
      this.measureIssuerDetailsHeight(document, issuer, detailColumns.leftWidth, layout),
      this.measureBillToDetailsHeight(document, data, detailColumns.rightWidth, layout),
    );
    const tableHeight = this.measureItemsTableHeight(
      document,
      data,
      contentWidth,
      layout,
    );
    const footerHeight = this.measureFooterHeight(document, data, layout, pageHeight);

    return (
      layout.topPadding +
      headerHeight +
      layout.detailGap +
      1 +
      layout.detailGap +
      detailsHeight +
      layout.detailGap +
      1 +
      layout.detailGap +
      tableHeight +
      layout.footerTopGap +
      footerHeight
    );
  }

  private drawHeader(
    document: PDFKit.PDFDocument,
    startY: number,
    pageWidth: number,
    issuer: FooterIssuer,
    data: BillingDocumentPdfData,
    headerVariant: HeaderVariant,
    layout: LayoutConfig,
  ): number {
    const contentWidth = pageWidth - layout.margin * 2;
    const leftWidth = contentWidth - layout.metaWidth - 18;
    const metaX = pageWidth - layout.margin - layout.metaWidth;
    const hasLogo = Boolean(
      issuer.logoFilePath && existsSync(issuer.logoFilePath),
    );

    if (hasLogo && issuer.logoFilePath) {
      document.image(issuer.logoFilePath, layout.margin, startY, {
        fit: [leftWidth, layout.logoMaxHeight],
      });
    } else {
      document
        .font('Helvetica-BoldOblique')
        .fontSize(layout.brandFallbackSize)
        .fillColor(BRAND_COLOR)
        .text(issuer.companyName, layout.margin, startY + 10, {
          width: leftWidth,
        });
    }

    let metaY = startY;

    if (headerVariant.showRecipientCopy) {
      document
        .font('Helvetica')
        .fontSize(layout.metaLabelSize)
        .fillColor(BODY_TEXT)
        .text('Original for Recipient', metaX, metaY, {
          width: layout.metaWidth,
          align: 'right',
        });
      metaY += layout.metaLabelSize + 4;
    } else if (headerVariant.typeLabel) {
      document
        .font('Helvetica-Bold')
        .fontSize(layout.metaLabelSize)
        .fillColor(BRAND_COLOR)
        .text(headerVariant.typeLabel, metaX, metaY, {
          width: layout.metaWidth,
          align: 'right',
        });
      metaY += layout.metaLabelSize + 4;
    }

    document
      .font('Helvetica-Bold')
      .fontSize(layout.documentNumberSize)
      .fillColor(BRAND_COLOR)
      .text(data.documentNumber || 'Draft', metaX, metaY, {
        width: layout.metaWidth,
        align: 'right',
      });

    metaY += layout.documentNumberSize + 4;

    document
      .font('Helvetica-Bold')
      .fontSize(layout.dateSize)
      .fillColor(BODY_TEXT)
      .text('Date:', metaX, metaY, {
        width: 34,
        align: 'right',
      });
    document
      .font('Helvetica')
      .fontSize(layout.dateSize)
      .fillColor(BODY_TEXT)
      .text(` ${this.formatDateCompact(data.documentDate)}`, metaX + 34, metaY, {
        width: layout.metaWidth - 34,
        align: 'right',
      });

    metaY += layout.dateSize + 3;

    if (data.validUntil) {
      document
        .font('Helvetica')
        .fontSize(layout.dateSize - 1)
        .fillColor(LIGHT_TEXT)
        .text(`Valid Until: ${this.formatDateCompact(data.validUntil)}`, metaX, metaY, {
          width: layout.metaWidth,
          align: 'right',
        });
      metaY += layout.dateSize + 2;
    }

    return Math.max(
      startY + (hasLogo ? layout.logoMaxHeight : layout.brandFallbackSize * 2.15),
      metaY,
    ) + layout.headerGap;
  }

  private drawIssuerDetails(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    issuer: FooterIssuer,
    layout: LayoutConfig,
  ): number {
    document
      .font('Helvetica-BoldOblique')
      .fontSize(layout.detailHeadingSize)
      .fillColor(BRAND_COLOR)
      .text(issuer.companyName, x, y, {
        width,
      });

    let cursorY = y + layout.detailHeadingSize + 4;

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY,
      width,
      icon: 'address',
      lines: this.buildIssuerAddressLines(issuer),
      layout,
    });
    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + layout.detailBlockGap,
      width,
      icon: 'phone',
      lines: [issuer.phone || '-'],
      layout,
    });
    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + layout.detailBlockGap,
      width,
      icon: 'email',
      lines: [issuer.email || '-'],
      layout,
    });
    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + layout.detailBlockGap,
      width,
      icon: 'info',
      lines: this.buildIssuerInfoLines(issuer),
      layout,
    });

    return cursorY;
  }

  private drawBillToDetails(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    data: BillingDocumentPdfData,
    layout: LayoutConfig,
  ): number {
    document
      .font('Helvetica-BoldOblique')
      .fontSize(layout.detailHeadingSize)
      .fillColor(BRAND_COLOR)
      .text('Bill to:', x, y, {
        width,
      });

    let cursorY = y + layout.detailHeadingSize + 4;

    document
      .font('Helvetica-Bold')
      .fontSize(layout.customerNameSize)
      .fillColor(BODY_TEXT)
      .text(this.resolveCustomerName(data), x, cursorY, {
        width,
      });

    cursorY += layout.customerNameSize + 2;

    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY,
      width,
      icon: 'address',
      lines: [
        this.resolveCustomerBranch(data),
        this.resolveCustomerAddress(data),
      ],
      layout,
    });
    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + layout.detailBlockGap,
      width,
      icon: 'person',
      lines: [this.resolveCustomerContact(data)],
      layout,
    });
    cursorY = this.drawIconTextBlock(document, {
      x,
      y: cursorY + layout.detailBlockGap,
      width,
      icon: 'info',
      lines: [
        `Place of Supply: ${data.customer.placeOfSupply || '-'}`,
        `GSTIN: ${data.customer.gstin || '-'}`,
      ],
      layout,
    });

    return cursorY;
  }

  private drawItemsTable(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    x: number,
    contentWidth: number,
    startY: number,
    layout: LayoutConfig,
  ): number {
    const columns = this.resolveTableColumns(contentWidth);
    const positions = this.resolveColumnPositions(x, columns);
    let cursorY = startY;

    columns.forEach((column, index) => {
      this.drawTableCell(
        document,
        positions[index],
        cursorY,
        column.width,
        layout.tableHeaderHeight,
        '#FFFFFF',
      );
      document
        .font('Helvetica-Bold')
        .fontSize(layout.tableHeaderFontSize)
        .fillColor(BRAND_COLOR)
        .text(column.label, positions[index] + layout.tableCellPaddingX, cursorY + 7, {
          width: column.width - layout.tableCellPaddingX * 2,
          align: column.align,
        });
    });

    cursorY += layout.tableHeaderHeight;

    data.lineItems.forEach((lineItem, index) => {
      const rowHeight = this.measureLineItemRowHeight(
        document,
        lineItem,
        columns[1].width,
        columns[2].width,
        layout,
      );
      const fillColor = index % 2 === 0 ? ALT_ROW : '#FFFFFF';

      columns.forEach((column, columnIndex) => {
        this.drawTableCell(
          document,
          positions[columnIndex],
          cursorY,
          column.width,
          rowHeight,
          fillColor,
        );
      });

      document
        .font('Helvetica-Bold')
        .fontSize(layout.tableBodyFontSize + 1)
        .fillColor(BODY_TEXT)
        .text(String(index + 1), positions[0] + layout.tableCellPaddingX, cursorY + layout.tableCellPaddingTop, {
          width: columns[0].width - layout.tableCellPaddingX * 2,
          align: 'center',
        });

      const productTextY = cursorY + layout.tableCellPaddingTop;
      const productWidth = columns[1].width - layout.tableCellPaddingX * 2;
      const descriptionWidth = columns[2].width - layout.tableCellPaddingX * 2;
      document
        .font('Helvetica-Bold')
        .fontSize(layout.tableBodyFontSize)
        .fillColor(BODY_TEXT)
        .text((lineItem.productServiceName || 'UNTITLED ITEM').toUpperCase(), positions[1] + layout.tableCellPaddingX, productTextY, {
          width: productWidth,
        });

      const productNameHeight = this.measureTextHeight(
        document,
        (lineItem.productServiceName || 'UNTITLED ITEM').toUpperCase(),
        productWidth,
        'Helvetica-Bold',
        layout.tableBodyFontSize,
        layout.detailLineGap,
      );

      document
        .font('Helvetica')
        .fontSize(layout.tableDescriptionFontSize)
        .fillColor(BODY_TEXT)
        .text(lineItem.description?.trim() || '-', positions[2] + layout.tableCellPaddingX, productTextY, {
          width: descriptionWidth,
          lineGap: layout.detailLineGap,
        });

      this.drawBodyCellText(
        document,
        positions[3],
        cursorY,
        columns[3],
        lineItem.hsnSac || '-',
        layout,
        'center',
      );
      this.drawBodyCellText(
        document,
        positions[4],
        cursorY,
        columns[4],
        this.formatNumber(lineItem.quantity),
        layout,
        'center',
      );
      this.drawBodyCellText(
        document,
        positions[5],
        cursorY,
        columns[5],
        this.formatMoney(lineItem.unitPrice),
        layout,
        'right',
      );
      this.drawBodyCellText(
        document,
        positions[6],
        cursorY,
        columns[6],
        `${this.formatNumber(lineItem.cgstPercentage)}%`,
        layout,
        'center',
      );
      this.drawBodyCellText(
        document,
        positions[7],
        cursorY,
        columns[7],
        `${this.formatNumber(lineItem.sgstPercentage)}%`,
        layout,
        'center',
      );
      this.drawBodyCellText(
        document,
        positions[8],
        cursorY,
        columns[8],
        this.formatMoney(lineItem.lineAmount),
        layout,
        'right',
        true,
      );

      cursorY += rowHeight;
    });

    const totalRowValues = [
      '',
      'TOTAL',
      '',
      '',
      this.formatNumber(this.totalQuantity(data.lineItems)),
      this.formatMoney(data.totalBeforeTax),
      '',
      '',
      this.formatMoney(data.totalAmount),
    ];

    columns.forEach((column, index) => {
      this.drawTableCell(
        document,
        positions[index],
        cursorY,
        column.width,
        layout.totalRowHeight,
        '#FFFFFF',
      );

      if (!totalRowValues[index]) {
        return;
      }

      document
        .font('Helvetica-Bold')
        .fontSize(layout.tableBodyFontSize + 0.2)
        .fillColor(BRAND_COLOR)
        .text(totalRowValues[index], positions[index] + layout.tableCellPaddingX, cursorY + 4.5, {
          width: column.width - layout.tableCellPaddingX * 2,
          align: index === 1 ? 'center' : column.align,
        });
    });

    return cursorY + layout.totalRowHeight;
  }

  private drawFooter(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    issuer: FooterIssuer,
    x: number,
    contentWidth: number,
    startY: number,
    pageHeight: number,
    layout: LayoutConfig,
  ): void {
    const leftWidth = contentWidth - 220;
    const rightWidth = 210;
    const rightX = x + contentWidth - rightWidth;

    document
      .font('Helvetica')
      .fontSize(layout.amountWordsSize)
      .fillColor(BODY_TEXT)
      .text(`Total: Rs. ${this.amountToWords(data.totalAmount)}`, x, startY, {
        width: leftWidth,
      });

    document
      .font('Helvetica-Bold')
      .fontSize(layout.signatoryLabelSize)
      .fillColor(BRAND_COLOR)
      .text('AUTHORIZED SIGNATORY', x, startY + layout.amountWordsSize + 5, {
        width: leftWidth,
      });

    this.drawSignatureAssets(
      document,
      x,
      startY + layout.amountWordsSize + layout.signatoryLabelSize + 10,
      issuer,
      layout,
    );

    this.drawTotalsSummary(
      document,
      data,
      rightX,
      startY,
      rightWidth,
      layout,
    );

    document
      .font('Helvetica')
      .fontSize(layout.footerTextSize)
      .fillColor(LIGHT_TEXT)
      .text('Issued using ERP System', x, pageHeight - layout.footerBottomGap - layout.footerTextSize, {
        width: contentWidth,
        align: 'right',
      });
  }

  private drawSignatureAssets(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    issuer: FooterIssuer,
    layout: LayoutConfig,
  ): void {
    let cursorX = x;

    if (issuer.signatureFilePath && existsSync(issuer.signatureFilePath)) {
      document.image(issuer.signatureFilePath, cursorX, y, {
        fit: [110, layout.signatureHeight],
      });
      cursorX += 116;
    }

    if (issuer.sealFilePath && existsSync(issuer.sealFilePath)) {
      document.image(issuer.sealFilePath, cursorX, y, {
        fit: [layout.sealHeight, layout.sealHeight],
      });
    }

    if (
      (!issuer.signatureFilePath || !existsSync(issuer.signatureFilePath)) &&
      (!issuer.sealFilePath || !existsSync(issuer.sealFilePath))
    ) {
      document
        .moveTo(x, y + layout.signatureHeight - 4)
        .lineTo(x + 110, y + layout.signatureHeight - 4)
        .lineWidth(0.9)
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
    layout: LayoutConfig,
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
        .fontSize(layout.totalsFontSize)
        .fillColor(BRAND_COLOR)
        .text(label, x, cursorY, {
          width: width - layout.totalsValueWidth,
          align: 'right',
        });

      document.text(
        useCurrency ? this.formatCurrency(value ?? 0) : this.formatMoney(value ?? 0),
        x + width - layout.totalsValueWidth,
        cursorY,
        {
          width: layout.totalsValueWidth,
          align: 'right',
        },
      );

      cursorY += layout.totalsRowGap;
    });
  }

  private drawBodyCellText(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    column: TableColumn,
    value: string,
    layout: LayoutConfig,
    align: 'left' | 'center' | 'right',
    bold = false,
  ): void {
    document
      .font(bold ? 'Helvetica-Bold' : 'Helvetica-Bold')
      .fontSize(layout.tableBodyFontSize + (bold ? 0.2 : 0))
      .fillColor(BODY_TEXT)
      .text(value, x + layout.tableCellPaddingX, y + layout.tableCellPaddingTop, {
        width: column.width - layout.tableCellPaddingX * 2,
        align,
      });
  }

  private drawTaxCell(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    amount: number,
    percentage: number,
    layout: LayoutConfig,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(layout.tableBodyFontSize)
      .fillColor(BODY_TEXT)
      .text(this.formatMoney(amount), x + layout.tableCellPaddingX, y + layout.tableCellPaddingTop, {
        width: width - layout.tableCellPaddingX * 2,
        align: 'right',
      });

    document
      .font('Helvetica')
      .fontSize(layout.tableTaxPercentSize)
      .fillColor(BODY_TEXT)
      .text(`${this.formatNumber(percentage)}%`, x + layout.tableCellPaddingX, y + layout.tableCellPaddingTop + layout.tableBodyFontSize + 4, {
        width: width - layout.tableCellPaddingX * 2,
        align: 'right',
      });
  }

  private drawTableCell(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string,
  ): void {
    document.save();
    document
      .lineWidth(0.85)
      .strokeColor(BORDER_COLOR)
      .fillColor(fillColor)
      .rect(x, y, width, height)
      .fillAndStroke(fillColor, BORDER_COLOR);
    document.restore();
  }

  private drawIconTextBlock(
    document: PDFKit.PDFDocument,
    options: {
      x: number;
      y: number;
      width: number;
      icon: IconType;
      lines: string[];
      layout: LayoutConfig;
    },
  ): number {
    const validLines = options.lines.filter(
      (line) => typeof line === 'string' && line.trim().length > 0,
    );

    if (!validLines.length) {
      return options.y;
    }

    const iconX = options.x;
    const textX = iconX + 16;
    const textWidth = options.width - 16;
    const textHeight = this.measureTextHeight(
      document,
      validLines.join('\n'),
      textWidth,
      'Helvetica',
      options.layout.detailFontSize,
      options.layout.detailLineGap,
    );

    this.drawIcon(document, options.icon, iconX, options.y + 1.5);
    document
      .font('Helvetica')
      .fontSize(options.layout.detailFontSize)
      .fillColor(BODY_TEXT)
      .text(validLines.join('\n'), textX, options.y, {
        width: textWidth,
        lineGap: options.layout.detailLineGap,
      });

    return options.y + Math.max(10, textHeight);
  }

  private drawIcon(
    document: PDFKit.PDFDocument,
    icon: IconType,
    x: number,
    y: number,
  ): void {
    document.save();
    document.lineWidth(0.95).strokeColor(ICON_COLOR).fillColor(ICON_COLOR);

    switch (icon) {
      case 'address':
        document
          .moveTo(x + 1, y + 7)
          .lineTo(x + 6, y + 2)
          .lineTo(x + 11, y + 7)
          .moveTo(x + 2.2, y + 7)
          .lineTo(x + 2.2, y + 12)
          .lineTo(x + 9.8, y + 12)
          .lineTo(x + 9.8, y + 7)
          .stroke();
        break;
      case 'phone':
        document
          .moveTo(x + 2, y + 4)
          .lineTo(x + 4.2, y + 2)
          .lineTo(x + 5.4, y + 3.2)
          .lineTo(x + 4.3, y + 4.3)
          .lineTo(x + 7.6, y + 7.6)
          .lineTo(x + 8.8, y + 6.6)
          .lineTo(x + 10, y + 7.8)
          .lineTo(x + 7.8, y + 10)
          .lineTo(x + 6.6, y + 8.8)
          .lineTo(x + 7.7, y + 7.7)
          .lineTo(x + 4.3, y + 4.3)
          .lineTo(x + 3.2, y + 5.4)
          .closePath()
          .stroke();
        break;
      case 'email':
        document.rect(x + 1, y + 3, 11, 8).stroke();
        document
          .moveTo(x + 1, y + 3)
          .lineTo(x + 6.5, y + 7.1)
          .lineTo(x + 12, y + 3)
          .stroke();
        break;
      case 'person':
        document.circle(x + 6.5, y + 4, 2).stroke();
        document
          .moveTo(x + 2.4, y + 11)
          .quadraticCurveTo(x + 6.5, y + 7.8, x + 10.6, y + 11)
          .stroke();
        break;
      case 'info':
      default:
        document.circle(x + 6.5, y + 7, 5.3).stroke();
        document
          .font('Helvetica-Bold')
          .fontSize(8.2)
          .fillColor(ICON_COLOR)
          .text('i', x + 5, y + 2.3, {
            width: 3,
            align: 'center',
          });
        break;
    }

    document.restore();
  }

  private drawDivider(
    document: PDFKit.PDFDocument,
    x1: number,
    x2: number,
    y: number,
  ): void {
    document
      .moveTo(x1, y)
      .lineTo(x2, y)
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .stroke();
  }

  private resolveHeaderVariant(documentTypeLabel: string): HeaderVariant {
    const normalized = documentTypeLabel.toUpperCase();

    if (normalized.includes('QUOTATION')) {
      return {
        showRecipientCopy: false,
        typeLabel: 'QUOTATION',
      };
    }

    if (normalized.includes('PROFORMA')) {
      return {
        showRecipientCopy: false,
        typeLabel: 'PROFORMA INVOICE',
      };
    }

    return {
      showRecipientCopy: true,
      typeLabel: null,
    };
  }

  private resolveDetailColumns(
    contentWidth: number,
    layout: LayoutConfig,
  ): { leftWidth: number; rightWidth: number } {
    const leftWidth = Math.floor((contentWidth - layout.detailColumnGap) * 0.5);
    return {
      leftWidth,
      rightWidth: contentWidth - leftWidth - layout.detailColumnGap,
    };
  }

  private resolveTableColumns(contentWidth: number): TableColumn[] {
    const fractions = [0.04, 0.2, 0.19, 0.085, 0.065, 0.12, 0.09, 0.09];
    const widths = fractions.map((fraction) => Math.floor(contentWidth * fraction));
    const usedWidth = widths.reduce((sum, value) => sum + value, 0);
    widths.push(contentWidth - usedWidth);

    return [
      { label: 'NO', width: widths[0], align: 'center' },
      { label: 'PRODUCT / SERVICE', width: widths[1], align: 'left' },
      { label: 'DESCRIPTION', width: widths[2], align: 'left' },
      { label: 'HSN/SAC', width: widths[3], align: 'center' },
      { label: 'QTY', width: widths[4], align: 'center' },
      { label: 'UNIT PRICE', width: widths[5], align: 'right' },
      { label: 'CGST %', width: widths[6], align: 'center' },
      { label: 'SGST %', width: widths[7], align: 'center' },
      { label: 'AMOUNT', width: widths[8], align: 'right' },
    ];
  }

  private resolveColumnPositions(x: number, columns: TableColumn[]): number[] {
    const positions = [x];

    columns.forEach((column, index) => {
      positions[index + 1] = positions[index] + column.width;
    });

    return positions;
  }

  private measureHeaderHeight(
    document: PDFKit.PDFDocument,
    issuer: FooterIssuer,
    data: BillingDocumentPdfData,
    headerVariant: HeaderVariant,
    contentWidth: number,
    layout: LayoutConfig,
  ): number {
    const leftWidth = contentWidth - layout.metaWidth - 18;
    const hasLogo = Boolean(
      issuer.logoFilePath && existsSync(issuer.logoFilePath),
    );

    const leftHeight = hasLogo
      ? layout.logoMaxHeight
      : this.measureTextHeight(
          document,
          issuer.companyName,
          leftWidth,
          'Helvetica-BoldOblique',
          layout.brandFallbackSize,
          0,
        ) + 10;

    let rightHeight = 0;

    if (headerVariant.showRecipientCopy || headerVariant.typeLabel) {
      rightHeight += layout.metaLabelSize + 4;
    }

    rightHeight += layout.documentNumberSize + 4;
    rightHeight += layout.dateSize + 3;

    if (data.validUntil) {
      rightHeight += layout.dateSize + 2;
    }

    return Math.max(leftHeight, rightHeight) + layout.headerGap;
  }

  private measureIssuerDetailsHeight(
    document: PDFKit.PDFDocument,
    issuer: FooterIssuer,
    width: number,
    layout: LayoutConfig,
  ): number {
    let height =
      this.measureTextHeight(
        document,
        issuer.companyName,
        width,
        'Helvetica-BoldOblique',
        layout.detailHeadingSize,
        0,
      ) +
      layout.detailHeadingSize * 0.25 +
      4;

    const blocks = [
      this.buildIssuerAddressLines(issuer),
      [issuer.phone || '-'],
      [issuer.email || '-'],
      this.buildIssuerInfoLines(issuer),
    ];

    blocks.forEach((lines, index) => {
      height += this.measureIconBlockHeight(document, lines, width, layout);

      if (index < blocks.length - 1) {
        height += layout.detailBlockGap;
      }
    });

    return height;
  }

  private measureBillToDetailsHeight(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    width: number,
    layout: LayoutConfig,
  ): number {
    let height =
      this.measureTextHeight(
        document,
        'Bill to:',
        width,
        'Helvetica-BoldOblique',
        layout.detailHeadingSize,
        0,
      ) +
      4 +
      layout.customerNameSize +
      2;

    const blocks = [
      [
        this.resolveCustomerBranch(data),
        this.resolveCustomerAddress(data),
      ],
      [this.resolveCustomerContact(data)],
      [
        `Place of Supply: ${data.customer.placeOfSupply || '-'}`,
        `GSTIN: ${data.customer.gstin || '-'}`,
      ],
    ];

    blocks.forEach((lines, index) => {
      height += this.measureIconBlockHeight(document, lines, width, layout);

      if (index < blocks.length - 1) {
        height += layout.detailBlockGap;
      }
    });

    return height;
  }

  private measureItemsTableHeight(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    contentWidth: number,
    layout: LayoutConfig,
  ): number {
    const columns = this.resolveTableColumns(contentWidth);

    let height = layout.tableHeaderHeight;

    data.lineItems.forEach((lineItem) => {
      height += this.measureLineItemRowHeight(
        document,
        lineItem,
        columns[1].width,
        columns[2].width,
        layout,
      );
    });

    height += layout.totalRowHeight;

    return height;
  }

  private measureLineItemRowHeight(
    document: PDFKit.PDFDocument,
    lineItem: BillingLineItem,
    productColumnWidth: number,
    descriptionColumnWidth: number,
    layout: LayoutConfig,
  ): number {
    const productTextWidth = productColumnWidth - layout.tableCellPaddingX * 2;
    const descriptionTextWidth =
      descriptionColumnWidth - layout.tableCellPaddingX * 2;
    const productHeight = this.measureTextHeight(
      document,
      (lineItem.productServiceName || 'UNTITLED ITEM').toUpperCase(),
      productTextWidth,
      'Helvetica-Bold',
      layout.tableBodyFontSize,
      layout.detailLineGap,
    );
    const descriptionHeight = this.measureTextHeight(
      document,
      lineItem.description?.trim() || '-',
      descriptionTextWidth,
      'Helvetica',
      layout.tableDescriptionFontSize,
      layout.detailLineGap,
    );

    return Math.max(
      layout.minRowHeight,
      layout.tableCellPaddingTop +
        Math.max(productHeight, descriptionHeight) +
        layout.tableCellPaddingBottom,
    );
  }

  private resolveStoredPdfPath(
    relativePath: string | null | undefined,
  ): string | null {
    const normalizedPath = relativePath?.trim();
    if (!normalizedPath) {
      return null;
    }

    const pathSegments = normalizedPath
      .split(/[\\/]+/)
      .filter(Boolean)
      .map((segment) => this.sanitizePathSegment(segment));

    if (!pathSegments.length) {
      return null;
    }

    const filePath = resolve(this.storageRoot, ...pathSegments);
    if (!filePath.startsWith(this.storageRoot) || !existsSync(filePath)) {
      return null;
    }

    return filePath;
  }

  private sanitizeFileName(value: string): string {
    return this.sanitizePathSegment(value).replace(/\.pdf$/i, '');
  }

  private sanitizePathSegment(value: string): string {
    const sanitized = value
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return sanitized || 'document';
  }

  private measureFooterHeight(
    document: PDFKit.PDFDocument,
    data: BillingDocumentPdfData,
    layout: LayoutConfig,
    pageHeight: number,
  ): number {
    const rightBlockHeight = layout.totalsRowGap * 4 + layout.totalsFontSize + 4;
    const leftBlockHeight =
      this.measureTextHeight(
        document,
        `Total: Rs. ${this.amountToWords(data.totalAmount)}`,
        300,
        'Helvetica',
        layout.amountWordsSize,
        0,
      ) +
      layout.signatoryLabelSize +
      12 +
      layout.signatureHeight;

    return Math.max(leftBlockHeight, rightBlockHeight) + pageHeight * 0;
  }

  private measureIconBlockHeight(
    document: PDFKit.PDFDocument,
    lines: string[],
    width: number,
    layout: LayoutConfig,
  ): number {
    const validLines = lines.filter((line) => line && line.trim().length > 0);

    if (!validLines.length) {
      return 0;
    }

    return Math.max(
      10,
      this.measureTextHeight(
        document,
        validLines.join('\n'),
        width - 16,
        'Helvetica',
        layout.detailFontSize,
        layout.detailLineGap,
      ),
    );
  }

  private measureTextHeight(
    document: PDFKit.PDFDocument,
    text: string,
    width: number,
    font: string,
    fontSize: number,
    lineGap: number,
  ): number {
    document.font(font).fontSize(fontSize);
    return document.heightOfString(text || '-', {
      width,
      lineGap,
    });
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
    const locality = [issuer.city, issuer.state].filter(Boolean).join(', ');
    const localityWithPin = [locality, issuer.pinCode].filter(Boolean).join(' ');
    const countrySuffix =
      issuer.country && localityWithPin
        ? `${localityWithPin}, ${issuer.country}`
        : issuer.country || localityWithPin;

    return [issuer.address || '-', countrySuffix].filter(Boolean);
  }

  private buildIssuerInfoLines(issuer: FooterIssuer): string[] {
    return [
      issuer.bankName || '-',
      issuer.accountNumber ? `A/C No: ${issuer.accountNumber}` : '',
      issuer.ifscCode ? `IFSC: ${issuer.ifscCode}` : '',
      issuer.gstin ? `GSTIN: ${issuer.gstin}` : '',
    ].filter(Boolean);
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
    return data.customer.phone || data.customer.email || data.customer.name || 'Contact Person';
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
    return lineItems.reduce((maxValue, item) => Math.max(maxValue, item[field]), 0);
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

  private formatDateCompact(value: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
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

  private formatCurrency(value: number): string {
    return `Rs. ${this.formatMoney(value)}`;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private amountToWords(amount: number): string {
    const absoluteAmount = Math.abs(amount);
    const rupees = Math.floor(absoluteAmount);
    const paise = Math.round((absoluteAmount - rupees) * 100);
    const rupeeWords = this.numberToWords(rupees);
    const paiseWords = paise > 0 ? ` and ${this.numberToWords(paise)} Paise` : '';

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
