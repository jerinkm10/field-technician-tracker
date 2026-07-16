import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  assertBranchAccess,
  getScopedBranchId,
} from '../auth/utils/branch-access.util';
import { BillingDocumentPdfData, BillingDocumentsService } from '../billing-documents/billing-documents.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { createPaginationMeta, normalizePagination } from '../common/utils/pagination.util';
import { OutstandingsService } from '../outstandings/outstandings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceLineItemDto } from './dto/invoice-line-item.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const invoiceSelect = Prisma.validator<Prisma.InvoiceSelect>()({
  id: true,
  invoiceType: true,
  invoiceNumber: true,
  invoiceDate: true,
  supplierId: true,
  customerId: true,
  customerName: true,
  customerAddress: true,
  customerGstin: true,
  placeOfSupply: true,
  notes: true,
  termsAndConditions: true,
  totalBeforeTax: true,
  totalTaxAmount: true,
  roundedOff: true,
  totalAmount: true,
  amountDue: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      id: true,
      supplierName: true,
      phone: true,
      email: true,
      gstin: true,
      address: true,
      bankName: true,
      accountNumber: true,
      ifscCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      gstin: true,
      address: true,
      billingAddress: true,
      shippingAddress: true,
      placeOfSupply: true,
      latitude: true,
      longitude: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  lineItems: {
    select: {
      id: true,
      invoiceId: true,
      productServiceName: true,
      description: true,
      hsnSac: true,
      quantity: true,
      unitPrice: true,
      cgstAmount: true,
      cgstPercentage: true,
      sgstAmount: true,
      sgstPercentage: true,
      lineAmount: true,
    },
  },
});

type InvoiceRecord = Prisma.InvoiceGetPayload<{
  select: typeof invoiceSelect;
}>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly billingDocumentsService: BillingDocumentsService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly outstandingsService: OutstandingsService,
  ) {}

  async listInvoices(
    query: ListInvoicesQueryDto,
    currentUser: JwtPayload,
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const scopedBranchId = getScopedBranchId(currentUser);

    const where: Prisma.InvoiceWhereInput = {
      ...(query.type ? { invoiceType: query.type } : {}),
      ...(scopedBranchId ? { supplierId: scopedBranchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            invoiceDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                supplier: {
                  supplierName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, invoices] = await Promise.all([
      this.prismaService.invoice.count({ where }),
      this.prismaService.invoice.findMany({
        where,
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: invoiceSelect,
      }),
    ]);

    return {
      data: invoices,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getInvoiceById(
    invoiceId: string,
    currentUser?: JwtPayload,
  ): Promise<InvoiceRecord> {
    return this.getInvoiceOrThrow(invoiceId, currentUser);
  }

  async getInvoiceByIdAndType(
    invoiceId: string,
    invoiceType: 'PROFORMA' | 'TAX',
    currentUser?: JwtPayload,
  ): Promise<InvoiceRecord> {
    const invoice = await this.getInvoiceOrThrow(invoiceId, currentUser);

    if (invoice.invoiceType !== invoiceType) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async getNextInvoiceNumber(
    invoiceType: 'PROFORMA' | 'TAX',
    documentDate?: string,
  ) {
    const normalizedDate = this.normalizeDocumentDate(documentDate);

    return {
      documentNumber: await this.generateNextInvoiceNumber(
        invoiceType,
        this.prismaService,
        normalizedDate,
      ),
    };
  }

  async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
    currentUser: JwtPayload,
  ): Promise<InvoiceRecord> {
    const scopedBranchId = getScopedBranchId(currentUser);
    const supplierId = scopedBranchId ?? createInvoiceDto.supplierId;

    assertBranchAccess(currentUser, supplierId);
    await this.ensureSupplierExists(supplierId);
    await this.ensureCustomerExists(createInvoiceDto.customerId);

    const company = await this.companySettingsService.getCompanySettings();
    const invoiceDate = this.normalizeDocumentDate(createInvoiceDto.invoiceDate);
    const termsAndConditions = this.resolveDefaultTerms(
      createInvoiceDto.invoiceType,
      createInvoiceDto.termsAndConditions,
      company,
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prismaService.$transaction(async (transaction) => {
          const invoiceNumber = await this.generateNextInvoiceNumber(
            createInvoiceDto.invoiceType,
            transaction,
            invoiceDate,
          );

          const invoice = await transaction.invoice.create({
            data: {
              invoiceType: createInvoiceDto.invoiceType,
              invoiceNumber,
              invoiceDate,
              supplierId,
              customerId: createInvoiceDto.customerId,
              customerName: createInvoiceDto.customerName,
              customerAddress: createInvoiceDto.customerAddress,
              customerGstin: createInvoiceDto.customerGstin,
              placeOfSupply: createInvoiceDto.placeOfSupply,
              notes: createInvoiceDto.notes,
              termsAndConditions,
              totalBeforeTax: createInvoiceDto.totalBeforeTax,
              totalTaxAmount: createInvoiceDto.totalTaxAmount,
              roundedOff: createInvoiceDto.roundedOff,
              totalAmount: createInvoiceDto.totalAmount,
              amountDue: createInvoiceDto.amountDue,
              status: createInvoiceDto.status ?? InvoiceStatus.DRAFT,
              lineItems: {
                create: createInvoiceDto.lineItems.map((item) =>
                  this.toLineItemCreateInput(item),
                ),
              },
            },
            select: invoiceSelect,
          });

          await this.outstandingsService.syncOutstandingForInvoice(
            {
              amountDue: invoice.amountDue,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              id: invoice.id,
              invoiceDate: invoice.invoiceDate,
              invoiceNumber: invoice.invoiceNumber,
              invoiceType: invoice.invoiceType,
              totalAmount: invoice.totalAmount,
            },
            transaction,
          );

          return invoice;
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error) && attempt < 2) {
          continue;
        }

        this.rethrowUniqueConstraint(error, 'Invoice number must be unique');
      }
    }

    throw new ConflictException('Unable to generate the next invoice number');
  }

  async updateInvoice(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
    currentUser: JwtPayload,
  ): Promise<InvoiceRecord> {
    await this.getInvoiceOrThrow(invoiceId, currentUser);
    const scopedBranchId = getScopedBranchId(currentUser);
    const supplierId =
      updateInvoiceDto.supplierId !== undefined
        ? scopedBranchId ?? updateInvoiceDto.supplierId
        : undefined;

    if (supplierId) {
      assertBranchAccess(currentUser, supplierId);
      await this.ensureSupplierExists(supplierId);
    }

    if (updateInvoiceDto.customerId) {
      await this.ensureCustomerExists(updateInvoiceDto.customerId);
    }

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const invoice = await transaction.invoice.update({
          where: {
            id: invoiceId,
          },
          data: {
            invoiceType: updateInvoiceDto.invoiceType,
            invoiceDate: updateInvoiceDto.invoiceDate
              ? this.normalizeDocumentDate(updateInvoiceDto.invoiceDate)
              : undefined,
            supplierId,
            customerId: updateInvoiceDto.customerId,
            customerName: updateInvoiceDto.customerName,
            customerAddress: updateInvoiceDto.customerAddress,
            customerGstin: updateInvoiceDto.customerGstin,
            placeOfSupply: updateInvoiceDto.placeOfSupply,
            notes: updateInvoiceDto.notes,
            termsAndConditions: updateInvoiceDto.termsAndConditions,
            totalBeforeTax: updateInvoiceDto.totalBeforeTax,
            totalTaxAmount: updateInvoiceDto.totalTaxAmount,
            roundedOff: updateInvoiceDto.roundedOff,
            totalAmount: updateInvoiceDto.totalAmount,
            amountDue: updateInvoiceDto.amountDue,
            status: updateInvoiceDto.status,
            lineItems: updateInvoiceDto.lineItems
              ? {
                  deleteMany: {},
                  create: updateInvoiceDto.lineItems.map((item) =>
                    this.toLineItemCreateInput(item),
                  ),
                }
              : undefined,
          },
          select: invoiceSelect,
        });

        await this.outstandingsService.syncOutstandingForInvoice(
          {
            amountDue: invoice.amountDue,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            id: invoice.id,
            invoiceDate: invoice.invoiceDate,
            invoiceNumber: invoice.invoiceNumber,
            invoiceType: invoice.invoiceType,
            totalAmount: invoice.totalAmount,
          },
          transaction,
        );

        return invoice;
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Invoice number must be unique');
    }
  }

  async deleteInvoice(
    invoiceId: string,
    currentUser?: JwtPayload,
  ): Promise<InvoiceRecord> {
    await this.getInvoiceOrThrow(invoiceId, currentUser);

    return this.prismaService.invoice.delete({
      where: {
        id: invoiceId,
      },
      select: invoiceSelect,
    });
  }

  async deleteInvoiceByType(
    invoiceId: string,
    invoiceType: 'PROFORMA' | 'TAX',
    currentUser?: JwtPayload,
  ): Promise<InvoiceRecord> {
    await this.getInvoiceByIdAndType(invoiceId, invoiceType, currentUser);
    return this.deleteInvoice(invoiceId, currentUser);
  }

  async getInvoicePdf(
    invoiceId: string,
    currentUser?: JwtPayload,
  ): Promise<Buffer> {
    const invoice = await this.getInvoiceById(invoiceId, currentUser);
    return this.buildInvoicePdf(invoice);
  }

  async getInvoicePdfByType(
    invoiceId: string,
    invoiceType: 'PROFORMA' | 'TAX',
    currentUser?: JwtPayload,
  ): Promise<Buffer> {
    const invoice = await this.getInvoiceByIdAndType(
      invoiceId,
      invoiceType,
      currentUser,
    );
    return this.buildInvoicePdf(invoice);
  }

  private async getInvoiceOrThrow(
    invoiceId: string,
    currentUser?: JwtPayload,
  ): Promise<InvoiceRecord> {
    const invoice = await this.prismaService.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: invoiceSelect,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (currentUser) {
      assertBranchAccess(currentUser, invoice.supplierId, 'Invoice not found');
    }

    return invoice;
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: {
        id: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const customer = await this.prismaService.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async buildInvoicePdf(invoice: InvoiceRecord): Promise<Buffer> {
    const company = await this.companySettingsService.getCompanyBranding();
    return this.billingDocumentsService.buildPdfBuffer(
      this.toPdfData(invoice, company),
    );
  }

  private resolveDefaultTerms(
    invoiceType: InvoiceType,
    providedTerms: string | null | undefined,
    company: Awaited<ReturnType<CompanySettingsService['getCompanySettings']>>,
  ): string | null {
    const normalizedTerms = providedTerms?.trim();
    if (normalizedTerms) {
      return normalizedTerms;
    }

    if (!company) {
      return null;
    }

    return invoiceType === InvoiceType.PROFORMA
      ? company.proformaTermsAndConditions
      : company.invoiceTermsAndConditions;
  }

  private normalizeDocumentDate(documentDate?: string | null): Date {
    const rawValue = documentDate?.trim();
    const parsedDate = rawValue ? new Date(rawValue) : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid invoice date');
    }

    return parsedDate;
  }

  private async generateNextInvoiceNumber(
    invoiceType: InvoiceType,
    prisma: Prisma.TransactionClient | PrismaService,
    invoiceDate: Date,
  ): Promise<string> {
    const year = invoiceDate.getFullYear();
    const prefix = `${invoiceType === InvoiceType.TAX ? 'TAX' : 'PROFORMA'}-${year}-`;
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        invoiceType,
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      select: {
        invoiceNumber: true,
      },
    });

    const nextSequence =
      existingInvoices.reduce((maxSequence, invoice) => {
        const lastToken = invoice.invoiceNumber.split('-').at(-1) ?? '0';
        const parsedSequence = Number.parseInt(lastToken, 10);
        return Number.isNaN(parsedSequence)
          ? maxSequence
          : Math.max(maxSequence, parsedSequence);
      }, 0) + 1;

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
  }

  private toPdfData(
    invoice: InvoiceRecord,
    company: Awaited<ReturnType<CompanySettingsService['getCompanyBranding']>>,
  ): BillingDocumentPdfData {
    return {
      company,
      documentTypeLabel:
        invoice.invoiceType === 'PROFORMA' ? 'Proforma Invoice' : 'Tax Invoice',
      documentNumber: invoice.invoiceNumber,
      documentDate: invoice.invoiceDate,
      supplier: {
        name: invoice.supplier.supplierName,
        phone: invoice.supplier.phone,
        email: invoice.supplier.email,
        gstin: invoice.supplier.gstin,
        address: invoice.supplier.address,
        bankName: invoice.supplier.bankName,
        accountNumber: invoice.supplier.accountNumber,
        ifscCode: invoice.supplier.ifscCode,
      },
      customer: {
        name: invoice.customerName,
        phone: invoice.customer.phone,
        email: invoice.customer.email,
        gstin: invoice.customerGstin,
        address:
          invoice.customer.billingAddress ??
          invoice.customerAddress ??
          invoice.customer.address,
        placeOfSupply: invoice.placeOfSupply,
      },
      lineItems: invoice.lineItems,
      totalBeforeTax: invoice.totalBeforeTax,
      totalTaxAmount: invoice.totalTaxAmount,
      roundedOff: invoice.roundedOff,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      status: invoice.status,
    };
  }

  private toLineItemCreateInput(
    lineItem: InvoiceLineItemDto,
  ): Prisma.InvoiceLineItemUncheckedCreateWithoutInvoiceInput {
    return {
      productServiceName: lineItem.productServiceName,
      description: lineItem.description,
      hsnSac: lineItem.hsnSac,
      quantity: lineItem.quantity,
      unitPrice: lineItem.unitPrice,
      cgstAmount: lineItem.cgstAmount,
      cgstPercentage: lineItem.cgstPercentage,
      sgstAmount: lineItem.sgstAmount,
      sgstPercentage: lineItem.sgstPercentage,
      lineAmount: lineItem.lineAmount,
    };
  }

  private rethrowUniqueConstraint(error: unknown, message: string): never {
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException(message);
    }

    throw error;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
