import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { BillingDocumentPdfData, BillingDocumentsService } from '../billing-documents/billing-documents.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { ListQuotationsQueryDto } from './dto/list-quotations-query.dto';
import { QuotationLineItemDto } from './dto/quotation-line-item.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

const quotationSelect = Prisma.validator<Prisma.QuotationSelect>()({
  id: true,
  quotationNumber: true,
  quotationDate: true,
  validUntil: true,
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
  pdfFilePath: true,
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
      quotationId: true,
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

type QuotationRecord = Prisma.QuotationGetPayload<{
  select: typeof quotationSelect;
}>;

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly billingDocumentsService: BillingDocumentsService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async listQuotations(query: ListQuotationsQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.QuotationWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            quotationDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                quotationNumber: {
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

    const [total, quotations] = await Promise.all([
      this.prismaService.quotation.count({ where }),
      this.prismaService.quotation.findMany({
        where,
        orderBy: [{ quotationDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: quotationSelect,
      }),
    ]);

    return {
      data: quotations,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getQuotationById(quotationId: string): Promise<QuotationRecord> {
    return this.getQuotationOrThrow(quotationId);
  }

  async getNextQuotationNumber(documentDate?: string) {
    const normalizedDate = this.normalizeDocumentDate(documentDate);

    return {
      documentNumber: await this.generateNextQuotationNumber(
        this.prismaService,
        normalizedDate,
      ),
    };
  }

  async createQuotation(createQuotationDto: CreateQuotationDto) {
    await this.ensureSupplierExists(createQuotationDto.supplierId);
    await this.ensureCustomerExists(createQuotationDto.customerId);

    const company = await this.companySettingsService.getCompanySettings();
    const quotationDate = this.normalizeDocumentDate(
      createQuotationDto.quotationDate,
    );
    const termsAndConditions =
      createQuotationDto.termsAndConditions?.trim() ||
      company?.quotationTermsAndConditions ||
      null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prismaService.quotation.create({
          data: {
            quotationNumber: await this.generateNextQuotationNumber(
              this.prismaService,
              quotationDate,
            ),
            quotationDate,
            validUntil: new Date(createQuotationDto.validUntil),
            supplierId: createQuotationDto.supplierId,
            customerId: createQuotationDto.customerId,
            customerName: createQuotationDto.customerName,
            customerAddress: createQuotationDto.customerAddress,
            customerGstin: createQuotationDto.customerGstin,
            placeOfSupply: createQuotationDto.placeOfSupply,
            notes: createQuotationDto.notes,
            termsAndConditions,
            totalBeforeTax: createQuotationDto.totalBeforeTax,
            totalTaxAmount: createQuotationDto.totalTaxAmount,
            roundedOff: createQuotationDto.roundedOff,
            totalAmount: createQuotationDto.totalAmount,
            pdfFilePath: null,
            status: createQuotationDto.status ?? QuotationStatus.DRAFT,
            lineItems: {
              create: createQuotationDto.lineItems.map((item) =>
                this.toLineItemCreateInput(item),
              ),
            },
          },
          select: quotationSelect,
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error) && attempt < 2) {
          continue;
        }

        this.rethrowUniqueConstraint(error, 'Quotation number must be unique');
      }
    }

    throw new ConflictException('Unable to generate the next quotation number');
  }

  async updateQuotation(
    quotationId: string,
    updateQuotationDto: UpdateQuotationDto,
  ) {
    await this.getQuotationOrThrow(quotationId);

    if (updateQuotationDto.supplierId) {
      await this.ensureSupplierExists(updateQuotationDto.supplierId);
    }

    if (updateQuotationDto.customerId) {
      await this.ensureCustomerExists(updateQuotationDto.customerId);
    }

    try {
      return await this.prismaService.quotation.update({
        where: { id: quotationId },
        data: {
          quotationDate: updateQuotationDto.quotationDate
            ? this.normalizeDocumentDate(updateQuotationDto.quotationDate)
            : undefined,
          validUntil: updateQuotationDto.validUntil
            ? new Date(updateQuotationDto.validUntil)
            : undefined,
          supplierId: updateQuotationDto.supplierId,
          customerId: updateQuotationDto.customerId,
          customerName: updateQuotationDto.customerName,
          customerAddress: updateQuotationDto.customerAddress,
          customerGstin: updateQuotationDto.customerGstin,
          placeOfSupply: updateQuotationDto.placeOfSupply,
          notes: updateQuotationDto.notes,
          termsAndConditions: updateQuotationDto.termsAndConditions,
          totalBeforeTax: updateQuotationDto.totalBeforeTax,
          totalTaxAmount: updateQuotationDto.totalTaxAmount,
          roundedOff: updateQuotationDto.roundedOff,
          totalAmount: updateQuotationDto.totalAmount,
          pdfFilePath: null,
          status: updateQuotationDto.status,
          lineItems: updateQuotationDto.lineItems
            ? {
                deleteMany: {},
                create: updateQuotationDto.lineItems.map((item) =>
                  this.toLineItemCreateInput(item),
                ),
              }
            : undefined,
        },
        select: quotationSelect,
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Quotation number must be unique');
    }
  }

  async deleteQuotation(quotationId: string) {
    await this.getQuotationOrThrow(quotationId);

    return this.prismaService.quotation.delete({
      where: { id: quotationId },
      select: quotationSelect,
    });
  }

  async getQuotationPdf(quotationId: string): Promise<Buffer> {
    const quotation = await this.getQuotationOrThrow(quotationId);
    return this.ensureStoredQuotationPdf(quotation);
  }

  private async getQuotationOrThrow(
    quotationId: string,
  ): Promise<QuotationRecord> {
    const quotation = await this.prismaService.quotation.findUnique({
      where: { id: quotationId },
      select: quotationSelect,
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
  }

  private async ensureCustomerExists(customerId: string): Promise<void> {
    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async ensureStoredQuotationPdf(
    quotation: QuotationRecord,
  ): Promise<Buffer> {
    const storedPdfBuffer = await this.billingDocumentsService.readStoredPdfBuffer(
      quotation.pdfFilePath,
    );
    if (storedPdfBuffer) {
      return storedPdfBuffer;
    }

    const company = await this.companySettingsService.getCompanyBranding();
    const pdfBuffer = await this.billingDocumentsService.buildPdfBuffer(
      this.toPdfData(quotation, company),
    );
    const pdfFilePath = await this.billingDocumentsService.storePdfBuffer(
      'quotations',
      quotation.quotationNumber,
      pdfBuffer,
    );

    await this.prismaService.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        pdfFilePath,
      },
    });

    return pdfBuffer;
  }

  private toLineItemCreateInput(
    lineItem: QuotationLineItemDto,
  ): Prisma.QuotationLineItemUncheckedCreateWithoutQuotationInput {
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

  private normalizeDocumentDate(documentDate?: string | null): Date {
    const rawValue = documentDate?.trim();
    const parsedDate = rawValue ? new Date(rawValue) : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid quotation date');
    }

    return parsedDate;
  }

  private async generateNextQuotationNumber(
    prisma: Prisma.TransactionClient | PrismaService,
    quotationDate: Date,
  ): Promise<string> {
    const year = quotationDate.getFullYear();
    const prefix = `QUOTATION-${year}-`;
    const existingQuotations = await prisma.quotation.findMany({
      where: {
        quotationNumber: {
          startsWith: prefix,
        },
      },
      select: {
        quotationNumber: true,
      },
    });

    const nextSequence =
      existingQuotations.reduce((maxSequence, quotation) => {
        const lastToken = quotation.quotationNumber.split('-').at(-1) ?? '0';
        const parsedSequence = Number.parseInt(lastToken, 10);
        return Number.isNaN(parsedSequence)
          ? maxSequence
          : Math.max(maxSequence, parsedSequence);
      }, 0) + 1;

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
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

  private toPdfData(
    quotation: QuotationRecord,
    company: Awaited<ReturnType<CompanySettingsService['getCompanyBranding']>>,
  ): BillingDocumentPdfData {
    return {
      company,
      documentTypeLabel: 'Quotation',
      documentNumber: quotation.quotationNumber,
      documentDate: quotation.quotationDate,
      validUntil: quotation.validUntil,
      supplier: {
        name: quotation.supplier.supplierName,
        phone: quotation.supplier.phone,
        email: quotation.supplier.email,
        gstin: quotation.supplier.gstin,
        address: quotation.supplier.address,
        bankName: quotation.supplier.bankName,
        accountNumber: quotation.supplier.accountNumber,
        ifscCode: quotation.supplier.ifscCode,
      },
      customer: {
        name: quotation.customerName,
        phone: quotation.customer.phone,
        email: quotation.customer.email,
        gstin: quotation.customerGstin,
        address:
          quotation.customer.billingAddress ??
          quotation.customerAddress ??
          quotation.customer.address,
        placeOfSupply: quotation.placeOfSupply,
      },
      lineItems: quotation.lineItems,
      totalBeforeTax: quotation.totalBeforeTax,
      totalTaxAmount: quotation.totalTaxAmount,
      roundedOff: quotation.roundedOff,
      totalAmount: quotation.totalAmount,
      amountDue: quotation.totalAmount,
      notes: quotation.notes,
      termsAndConditions: quotation.termsAndConditions,
      status: quotation.status,
    };
  }
}
