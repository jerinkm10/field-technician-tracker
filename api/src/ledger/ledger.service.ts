import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceType, Prisma } from '@prisma/client';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';

const LEDGER_DOCUMENT_TYPES = [
  'PROFORMA_INVOICE',
  'TAX_INVOICE',
  'AMC_INVOICE',
  'QUOTATION',
  'OUTSTANDING',
] as const;

type LedgerDocumentType = (typeof LEDGER_DOCUMENT_TYPES)[number];

type InvoiceLedgerRecord = Prisma.InvoiceGetPayload<{
  select: {
    id: true;
    invoiceType: true;
    invoiceNumber: true;
    invoiceDate: true;
    customerId: true;
    customerName: true;
    totalAmount: true;
    amountDue: true;
    status: true;
    notes: true;
    createdAt: true;
    updatedAt: true;
    supplier: {
      select: {
        supplierName: true;
      };
    };
    lineItems: {
      select: {
        productServiceName: true;
        description: true;
        hsnSac: true;
        quantity: true;
        unitPrice: true;
        lineAmount: true;
      };
    };
    amcInvoices: {
      select: {
        amcId: true;
        amc: {
          select: {
            amcNumber: true;
          };
        };
      };
    };
  };
}>;

type QuotationLedgerRecord = Prisma.QuotationGetPayload<{
  select: {
    id: true;
    quotationNumber: true;
    quotationDate: true;
    validUntil: true;
    customerId: true;
    customerName: true;
    totalAmount: true;
    status: true;
    notes: true;
    createdAt: true;
    updatedAt: true;
    supplier: {
      select: {
        supplierName: true;
      };
    };
    lineItems: {
      select: {
        productServiceName: true;
        description: true;
        hsnSac: true;
        quantity: true;
        unitPrice: true;
        lineAmount: true;
      };
    };
  };
}>;

type OutstandingLedgerRecord = Prisma.OutstandingGetPayload<{
  select: {
    id: true;
    invoiceId: true;
    invoiceType: true;
    invoiceNumber: true;
    customerId: true;
    customerName: true;
    invoiceDate: true;
    dueDate: true;
    totalAmount: true;
    paidAmount: true;
    creditAmount: true;
    outstandingAmount: true;
    status: true;
    note: true;
    createdAt: true;
    updatedAt: true;
    invoice: {
      select: {
        supplier: {
          select: {
            supplierName: true;
          };
        };
        lineItems: {
          select: {
            productServiceName: true;
            description: true;
            hsnSac: true;
            quantity: true;
            unitPrice: true;
            lineAmount: true;
          };
        };
        amcInvoices: {
          select: {
            amcId: true;
            amc: {
              select: {
                amcNumber: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type LedgerLineItem = {
  productServiceName: string;
  description: string | null;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
};

type LedgerEntry = {
  id: string;
  sourceId: string;
  sourceCategory: 'INVOICE' | 'QUOTATION' | 'OUTSTANDING';
  date: Date;
  type: LedgerDocumentType;
  documentNumber: string;
  customerId: string;
  customerName: string;
  productService: string;
  hsnSacCode: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
  note: string | null;
  branchName: string | null;
  referenceNumber: string | null;
  totalAmount: number;
  amountDue: number | null;
  outstandingAmount: number | null;
  dueDate: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: LedgerLineItem[];
  runningDelta: number;
};

const invoiceSelect = Prisma.validator<Prisma.InvoiceSelect>()({
  id: true,
  invoiceType: true,
  invoiceNumber: true,
  invoiceDate: true,
  customerId: true,
  customerName: true,
  totalAmount: true,
  amountDue: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      supplierName: true,
    },
  },
  lineItems: {
    select: {
      productServiceName: true,
      description: true,
      hsnSac: true,
      quantity: true,
      unitPrice: true,
      lineAmount: true,
    },
  },
  amcInvoices: {
    select: {
      amcId: true,
      amc: {
        select: {
          amcNumber: true,
        },
      },
    },
  },
});

const quotationSelect = Prisma.validator<Prisma.QuotationSelect>()({
  id: true,
  quotationNumber: true,
  quotationDate: true,
  validUntil: true,
  customerId: true,
  customerName: true,
  totalAmount: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      supplierName: true,
    },
  },
  lineItems: {
    select: {
      productServiceName: true,
      description: true,
      hsnSac: true,
      quantity: true,
      unitPrice: true,
      lineAmount: true,
    },
  },
});

const outstandingSelect = Prisma.validator<Prisma.OutstandingSelect>()({
  id: true,
  invoiceId: true,
  invoiceType: true,
  invoiceNumber: true,
  customerId: true,
  customerName: true,
  invoiceDate: true,
  dueDate: true,
  totalAmount: true,
  paidAmount: true,
  creditAmount: true,
  outstandingAmount: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  invoice: {
    select: {
      supplier: {
        select: {
          supplierName: true,
        },
      },
      lineItems: {
        select: {
          productServiceName: true,
          description: true,
          hsnSac: true,
          quantity: true,
          unitPrice: true,
          lineAmount: true,
        },
      },
      amcInvoices: {
        select: {
          amcId: true,
          amc: {
            select: {
              amcNumber: true,
            },
          },
        },
      },
    },
  },
});

@Injectable()
export class LedgerService {
  constructor(private readonly prismaService: PrismaService) {}

  async listLedgerEntries(query: ListLedgerQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);

    const productServiceFilter = query.productServiceId
      ? await this.prismaService.productService.findUnique({
          where: {
            id: query.productServiceId,
          },
          select: {
            name: true,
            hsnSacCode: true,
          },
        })
      : null;

    if (query.productServiceId && !productServiceFilter) {
      return {
        data: [],
        meta: createPaginationMeta(0, page, limit),
      };
    }

    const searchDateRange = this.resolveSearchDateRange(query.search);
    const normalizedDocumentType = this.normalizeDocumentType(query.documentType);
    const normalizedStatus = query.status?.trim().toUpperCase();
    const normalizedHsnSacCode = query.hsnSacCode?.trim().toUpperCase();

    const [invoiceEntries, quotationEntries, outstandingEntries] =
      await Promise.all([
        this.shouldIncludeInvoices(normalizedDocumentType)
          ? this.fetchInvoiceEntries(
              query,
              searchDateRange,
              normalizedDocumentType,
              normalizedStatus,
              normalizedHsnSacCode,
              productServiceFilter,
            )
          : Promise.resolve([]),
        this.shouldIncludeQuotations(normalizedDocumentType)
          ? this.fetchQuotationEntries(
              query,
              searchDateRange,
              normalizedStatus,
              normalizedHsnSacCode,
              productServiceFilter,
            )
          : Promise.resolve([]),
        this.shouldIncludeOutstandings(normalizedDocumentType)
          ? this.fetchOutstandingEntries(
              query,
              searchDateRange,
              normalizedStatus,
              normalizedHsnSacCode,
              productServiceFilter,
            )
          : Promise.resolve([]),
      ]);

    const entries = this.applyRunningBalance([
      ...invoiceEntries,
      ...quotationEntries,
      ...outstandingEntries,
    ]).sort((left, right) => {
      const dateDifference = right.date.getTime() - left.date.getTime();
      if (dateDifference !== 0) {
        return dateDifference;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

    const pagedEntries = entries.slice(skip, skip + limit).map((entry) =>
      this.toApiEntry(entry),
    );

    return {
      data: pagedEntries,
      meta: createPaginationMeta(entries.length, page, limit),
    };
  }

  async getLedgerEntryById(ledgerEntryId: string) {
    const { type, sourceId } = this.parseLedgerId(ledgerEntryId);

    switch (type) {
      case 'PROFORMA_INVOICE':
      case 'TAX_INVOICE':
      case 'AMC_INVOICE': {
        const invoice = await this.prismaService.invoice.findUnique({
          where: {
            id: sourceId,
          },
          select: invoiceSelect,
        });

        if (!invoice) {
          throw new NotFoundException('Ledger entry not found');
        }

        return this.toApiEntry(this.mapInvoiceEntry(invoice));
      }

      case 'QUOTATION': {
        const quotation = await this.prismaService.quotation.findUnique({
          where: {
            id: sourceId,
          },
          select: quotationSelect,
        });

        if (!quotation) {
          throw new NotFoundException('Ledger entry not found');
        }

        return this.toApiEntry(this.mapQuotationEntry(quotation));
      }

      case 'OUTSTANDING': {
        const outstanding = await this.prismaService.outstanding.findUnique({
          where: {
            id: sourceId,
          },
          select: outstandingSelect,
        });

        if (!outstanding) {
          throw new NotFoundException('Ledger entry not found');
        }

        return this.toApiEntry(this.mapOutstandingEntry(outstanding));
      }

      default:
        throw new NotFoundException('Ledger entry not found');
    }
  }

  private async fetchInvoiceEntries(
    query: ListLedgerQueryDto,
    searchDateRange: { gte: Date; lt: Date } | null,
    documentType: LedgerDocumentType | null,
    status: string | undefined,
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Promise<LedgerEntry[]> {
    const where: Prisma.InvoiceWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            invoiceDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(documentType === 'AMC_INVOICE'
        ? {
            invoiceType: InvoiceType.TAX,
            amcInvoices: {
              some: {},
            },
          }
        : documentType === 'TAX_INVOICE'
          ? {
              invoiceType: InvoiceType.TAX,
              amcInvoices: {
                none: {},
              },
            }
          : documentType === 'PROFORMA_INVOICE'
            ? {
                invoiceType: InvoiceType.PROFORMA,
              }
            : {}),
      ...this.buildInvoiceLineItemFilter(hsnSacCode, productServiceFilter),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                lineItems: {
                  some: {
                    OR: [
                      {
                        productServiceName: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                      {
                        hsnSac: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                      {
                        description: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
              ...(searchDateRange
                ? [
                    {
                      invoiceDate: searchDateRange,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const invoices = await this.prismaService.invoice.findMany({
      where,
      orderBy: [{ invoiceDate: 'asc' }, { createdAt: 'asc' }],
      select: invoiceSelect,
    });

    return invoices
      .filter((invoice) => !status || invoice.status === status)
      .map((invoice) => this.mapInvoiceEntry(invoice));
  }

  private async fetchQuotationEntries(
    query: ListLedgerQueryDto,
    searchDateRange: { gte: Date; lt: Date } | null,
    status: string | undefined,
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Promise<LedgerEntry[]> {
    const where: Prisma.QuotationWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            quotationDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...this.buildQuotationLineItemFilter(hsnSacCode, productServiceFilter),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                quotationNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                lineItems: {
                  some: {
                    OR: [
                      {
                        productServiceName: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                      {
                        hsnSac: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                      {
                        description: {
                          contains: query.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
              ...(searchDateRange
                ? [
                    {
                      quotationDate: searchDateRange,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const quotations = await this.prismaService.quotation.findMany({
      where,
      orderBy: [{ quotationDate: 'asc' }, { createdAt: 'asc' }],
      select: quotationSelect,
    });

    return quotations
      .filter((quotation) => !status || quotation.status === status)
      .map((quotation) => this.mapQuotationEntry(quotation));
  }

  private async fetchOutstandingEntries(
    query: ListLedgerQueryDto,
    searchDateRange: { gte: Date; lt: Date } | null,
    status: string | undefined,
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Promise<LedgerEntry[]> {
    const where: Prisma.OutstandingWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            updatedAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...this.buildOutstandingLineItemFilter(hsnSacCode, productServiceFilter),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                note: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                invoice: {
                  lineItems: {
                    some: {
                      OR: [
                        {
                          productServiceName: {
                            contains: query.search.trim(),
                            mode: 'insensitive',
                          },
                        },
                        {
                          hsnSac: {
                            contains: query.search.trim(),
                            mode: 'insensitive',
                          },
                        },
                        {
                          description: {
                            contains: query.search.trim(),
                            mode: 'insensitive',
                          },
                        },
                      ],
                    },
                  },
                },
              },
              ...(searchDateRange
                ? [
                    {
                      updatedAt: searchDateRange,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const outstandings = await this.prismaService.outstanding.findMany({
      where,
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
      select: outstandingSelect,
    });

    return outstandings
      .filter((outstanding) => !status || outstanding.status === status)
      .map((outstanding) => this.mapOutstandingEntry(outstanding));
  }

  private buildInvoiceLineItemFilter(
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Prisma.InvoiceWhereInput {
    if (!hsnSacCode && !productServiceFilter) {
      return {};
    }

    return {
      lineItems: {
        some: {
          OR: [
            ...(hsnSacCode
              ? [
                  {
                    hsnSac: {
                      contains: hsnSacCode,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...(productServiceFilter
              ? [
                  {
                    productServiceName: {
                      equals: productServiceFilter.name,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    hsnSac: {
                      equals: productServiceFilter.hsnSacCode,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        },
      },
    };
  }

  private buildQuotationLineItemFilter(
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Prisma.QuotationWhereInput {
    if (!hsnSacCode && !productServiceFilter) {
      return {};
    }

    return {
      lineItems: {
        some: {
          OR: [
            ...(hsnSacCode
              ? [
                  {
                    hsnSac: {
                      contains: hsnSacCode,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            ...(productServiceFilter
              ? [
                  {
                    productServiceName: {
                      equals: productServiceFilter.name,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    hsnSac: {
                      equals: productServiceFilter.hsnSacCode,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        },
      },
    };
  }

  private buildOutstandingLineItemFilter(
    hsnSacCode: string | undefined,
    productServiceFilter: { name: string; hsnSacCode: string } | null,
  ): Prisma.OutstandingWhereInput {
    if (!hsnSacCode && !productServiceFilter) {
      return {};
    }

    return {
      invoice: {
        lineItems: {
          some: {
            OR: [
              ...(hsnSacCode
                ? [
                    {
                      hsnSac: {
                        contains: hsnSacCode,
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
              ...(productServiceFilter
                ? [
                    {
                      productServiceName: {
                        equals: productServiceFilter.name,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      hsnSac: {
                        equals: productServiceFilter.hsnSacCode,
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      },
    };
  }

  private mapInvoiceEntry(invoice: InvoiceLedgerRecord): LedgerEntry {
    const ledgerType: LedgerDocumentType =
      invoice.invoiceType === InvoiceType.PROFORMA
        ? 'PROFORMA_INVOICE'
        : invoice.amcInvoices.length > 0
          ? 'AMC_INVOICE'
          : 'TAX_INVOICE';

    return {
      id: `${ledgerType}:${invoice.id}`,
      sourceId: invoice.id,
      sourceCategory: 'INVOICE',
      date: invoice.invoiceDate,
      type: ledgerType,
      documentNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      productService: this.formatLineItemValue(
        invoice.lineItems.map((item) => item.productServiceName),
      ),
      hsnSacCode: this.formatLineItemValue(
        invoice.lineItems.map((item) => item.hsnSac),
      ),
      debit: this.roundCurrency(invoice.totalAmount),
      credit: 0,
      balance: this.roundCurrency(invoice.totalAmount),
      status: invoice.status,
      note: invoice.notes ?? null,
      branchName: invoice.supplier.supplierName,
      referenceNumber: invoice.amcInvoices[0]?.amc.amcNumber ?? null,
      totalAmount: this.roundCurrency(invoice.totalAmount),
      amountDue: this.roundCurrency(invoice.amountDue),
      outstandingAmount: null,
      dueDate: null,
      validUntil: null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      lineItems: invoice.lineItems.map((item) => ({
        productServiceName: item.productServiceName,
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
      })),
      runningDelta: this.roundCurrency(invoice.totalAmount),
    };
  }

  private mapQuotationEntry(quotation: QuotationLedgerRecord): LedgerEntry {
    return {
      id: `QUOTATION:${quotation.id}`,
      sourceId: quotation.id,
      sourceCategory: 'QUOTATION',
      date: quotation.quotationDate,
      type: 'QUOTATION',
      documentNumber: quotation.quotationNumber,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      productService: this.formatLineItemValue(
        quotation.lineItems.map((item) => item.productServiceName),
      ),
      hsnSacCode: this.formatLineItemValue(
        quotation.lineItems.map((item) => item.hsnSac),
      ),
      debit: 0,
      credit: 0,
      balance: 0,
      status: quotation.status,
      note: quotation.notes ?? null,
      branchName: quotation.supplier.supplierName,
      referenceNumber: null,
      totalAmount: this.roundCurrency(quotation.totalAmount),
      amountDue: null,
      outstandingAmount: null,
      dueDate: null,
      validUntil: quotation.validUntil,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
      lineItems: quotation.lineItems.map((item) => ({
        productServiceName: item.productServiceName,
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
      })),
      runningDelta: 0,
    };
  }

  private mapOutstandingEntry(outstanding: OutstandingLedgerRecord): LedgerEntry {
    const creditAmount = this.roundCurrency(
      outstanding.paidAmount + outstanding.creditAmount,
    );

    return {
      id: `OUTSTANDING:${outstanding.id}`,
      sourceId: outstanding.id,
      sourceCategory: 'OUTSTANDING',
      date: outstanding.updatedAt,
      type: 'OUTSTANDING',
      documentNumber: outstanding.invoiceNumber,
      customerId: outstanding.customerId,
      customerName: outstanding.customerName,
      productService: this.formatLineItemValue(
        outstanding.invoice.lineItems.map((item) => item.productServiceName),
      ),
      hsnSacCode: this.formatLineItemValue(
        outstanding.invoice.lineItems.map((item) => item.hsnSac),
      ),
      debit: 0,
      credit: creditAmount,
      balance: this.roundCurrency(outstanding.outstandingAmount),
      status: outstanding.status,
      note: outstanding.note ?? null,
      branchName: outstanding.invoice.supplier.supplierName,
      referenceNumber: outstanding.invoice.amcInvoices[0]?.amc.amcNumber ?? null,
      totalAmount: this.roundCurrency(outstanding.totalAmount),
      amountDue: null,
      outstandingAmount: this.roundCurrency(outstanding.outstandingAmount),
      dueDate: outstanding.dueDate,
      validUntil: null,
      createdAt: outstanding.createdAt,
      updatedAt: outstanding.updatedAt,
      lineItems: outstanding.invoice.lineItems.map((item) => ({
        productServiceName: item.productServiceName,
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
      })),
      runningDelta: this.roundCurrency(-creditAmount),
    };
  }

  private applyRunningBalance(entries: LedgerEntry[]): LedgerEntry[] {
    const sortedEntries = [...entries].sort((left, right) => {
      const dateDifference = left.date.getTime() - right.date.getTime();
      if (dateDifference !== 0) {
        return dateDifference;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    let runningBalance = 0;

    return sortedEntries.map((entry) => {
      runningBalance = this.roundCurrency(
        runningBalance + entry.runningDelta,
      );

      return {
        ...entry,
        balance: runningBalance,
      };
    });
  }

  private toApiEntry(entry: LedgerEntry) {
    return {
      id: entry.id,
      sourceId: entry.sourceId,
      sourceCategory: entry.sourceCategory,
      date: entry.date,
      type: entry.type,
      documentNumber: entry.documentNumber,
      customerId: entry.customerId,
      customerName: entry.customerName,
      productService: entry.productService,
      hsnSacCode: entry.hsnSacCode,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      status: entry.status,
      note: entry.note,
      branchName: entry.branchName,
      referenceNumber: entry.referenceNumber,
      totalAmount: entry.totalAmount,
      amountDue: entry.amountDue,
      outstandingAmount: entry.outstandingAmount,
      dueDate: entry.dueDate,
      validUntil: entry.validUntil,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lineItems: entry.lineItems,
    };
  }

  private shouldIncludeInvoices(
    documentType: LedgerDocumentType | null,
  ): boolean {
    return (
      !documentType ||
      documentType === 'PROFORMA_INVOICE' ||
      documentType === 'TAX_INVOICE' ||
      documentType === 'AMC_INVOICE'
    );
  }

  private shouldIncludeQuotations(
    documentType: LedgerDocumentType | null,
  ): boolean {
    return !documentType || documentType === 'QUOTATION';
  }

  private shouldIncludeOutstandings(
    documentType: LedgerDocumentType | null,
  ): boolean {
    return !documentType || documentType === 'OUTSTANDING';
  }

  private normalizeDocumentType(
    value: string | undefined,
  ): LedgerDocumentType | null {
    if (!value) {
      return null;
    }

    const normalizedValue = value.trim().toUpperCase();

    return (LEDGER_DOCUMENT_TYPES as readonly string[]).includes(normalizedValue)
      ? (normalizedValue as LedgerDocumentType)
      : null;
  }

  private resolveSearchDateRange(
    search: string | undefined,
  ): { gte: Date; lt: Date } | null {
    if (!search?.trim()) {
      return null;
    }

    const parsedDate = new Date(search.trim());
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const startDate = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return {
      gte: startDate,
      lt: endDate,
    };
  }

  private parseLedgerId(ledgerEntryId: string): {
    type: LedgerDocumentType;
    sourceId: string;
  } {
    const separatorIndex = ledgerEntryId.indexOf(':');
    if (separatorIndex <= 0) {
      throw new NotFoundException('Ledger entry not found');
    }

    const type = this.normalizeDocumentType(
      ledgerEntryId.slice(0, separatorIndex),
    );
    const sourceId = ledgerEntryId.slice(separatorIndex + 1);

    if (!type || !sourceId) {
      throw new NotFoundException('Ledger entry not found');
    }

    return {
      type,
      sourceId,
    };
  }

  private formatLineItemValue(values: string[]): string {
    const uniqueValues = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    return uniqueValues.length ? uniqueValues.join(', ') : '-';
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
