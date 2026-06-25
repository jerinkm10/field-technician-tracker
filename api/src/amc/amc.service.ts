import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmcBillingPeriod,
  AmcStatus,
  InvoiceStatus,
  InvoiceType,
  Prisma,
} from '@prisma/client';
import { existsSync } from 'fs';
import PDFDocument = require('pdfkit');
import { CompanySettingsService } from '../company-settings/company-settings.service';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { OutstandingsService } from '../outstandings/outstandings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmcDto } from './dto/create-amc.dto';
import { ListAmcQueryDto } from './dto/list-amc-query.dto';
import { UpdateAmcDto } from './dto/update-amc.dto';

const amcSelect = Prisma.validator<Prisma.AmcSelect>()({
  id: true,
  amcNumber: true,
  customerId: true,
  customerName: true,
  branchId: true,
  startDate: true,
  endDate: true,
  durationMonths: true,
  billingPeriod: true,
  billingPeriodMonths: true,
  contractAmount: true,
  taxPercentage: true,
  status: true,
  lastPaidDate: true,
  nextBillingDate: true,
  note: true,
  createdAt: true,
  updatedAt: true,
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
  branch: {
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
  invoices: {
    select: {
      id: true,
      invoiceId: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
      createdAt: true,
      invoice: {
        select: {
          id: true,
          invoiceType: true,
          invoiceNumber: true,
          invoiceDate: true,
          totalAmount: true,
          amountDue: true,
          status: true,
        },
      },
    },
  },
});

type AmcRecord = Prisma.AmcGetPayload<{
  select: typeof amcSelect;
}>;

type MinimalInvoiceRecord = {
  id: string;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  amountDue: number;
  status: InvoiceStatus;
};

type NormalizedAmcPayload = {
  amcNumber: string;
  customerId: string;
  customerName: string;
  branchId: string;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  billingPeriod: AmcBillingPeriod;
  billingPeriodMonths: number;
  contractAmount: number;
  taxPercentage: number;
  status: AmcStatus;
  lastPaidDate: Date | null;
  nextBillingDate: Date | null;
  note: string | null;
};

@Injectable()
export class AmcService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly outstandingsService: OutstandingsService,
  ) {}

  async listAmcs(query: ListAmcQueryDto) {
    await this.expirePastContracts();

    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.AmcWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.billingPeriod ? { billingPeriod: query.billingPeriod } : {}),
      ...(query.fromDate || query.toDate
        ? {
            startDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                amcNumber: {
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
                note: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                branch: {
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

    const [total, amcs] = await Promise.all([
      this.prismaService.amc.count({ where }),
      this.prismaService.amc.findMany({
        where,
        orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: amcSelect,
      }),
    ]);

    return {
      data: amcs.map((amc) => this.toApiAmc(amc)),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getAmcById(amcId: string) {
    await this.expirePastContracts();
    return this.toApiAmc(await this.getAmcOrThrow(amcId));
  }

  async createAmc(createAmcDto: CreateAmcDto) {
    const customer = await this.getCustomerOrThrow(createAmcDto.customerId);
    await this.ensureBranchExists(createAmcDto.branchId);

    const normalized = this.normalizeCreateInput({
      amcNumber: createAmcDto.amcNumber,
      branchId: createAmcDto.branchId,
      contractAmount: createAmcDto.contractAmount,
      customerId: customer.id,
      customerName: customer.name,
      endDate: createAmcDto.endDate,
      lastPaidDate: createAmcDto.lastPaidDate,
      nextBillingDate: createAmcDto.nextBillingDate,
      note: createAmcDto.note,
      startDate: createAmcDto.startDate,
      status: createAmcDto.status,
      taxPercentage: createAmcDto.taxPercentage,
      billingPeriod: createAmcDto.billingPeriod,
    });

    try {
      const amc = await this.prismaService.amc.create({
        data: normalized,
        select: amcSelect,
      });

      return this.toApiAmc(amc);
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'AMC number must be unique');
    }
  }

  async updateAmc(amcId: string, updateAmcDto: UpdateAmcDto) {
    const existingAmc = await this.getAmcOrThrow(amcId);

    const customer = updateAmcDto.customerId
      ? await this.getCustomerOrThrow(updateAmcDto.customerId)
      : existingAmc.customer;

    if (updateAmcDto.branchId) {
      await this.ensureBranchExists(updateAmcDto.branchId);
    }

    const normalized = this.normalizeUpdateInput({
      amcNumber: updateAmcDto.amcNumber ?? existingAmc.amcNumber,
      branchId: updateAmcDto.branchId ?? existingAmc.branchId,
      contractAmount: updateAmcDto.contractAmount ?? existingAmc.contractAmount,
      customerId: customer.id,
      customerName: updateAmcDto.customerName?.trim() || customer.name,
      endDate: updateAmcDto.endDate ?? existingAmc.endDate.toISOString(),
      lastPaidDate:
        updateAmcDto.lastPaidDate ??
        (existingAmc.lastPaidDate ? existingAmc.lastPaidDate.toISOString() : null),
      nextBillingDate:
        updateAmcDto.nextBillingDate ??
        (existingAmc.nextBillingDate ? existingAmc.nextBillingDate.toISOString() : null),
      note:
        updateAmcDto.note !== undefined ? updateAmcDto.note : existingAmc.note ?? undefined,
      startDate: updateAmcDto.startDate ?? existingAmc.startDate.toISOString(),
      status: updateAmcDto.status ?? existingAmc.status,
      taxPercentage: updateAmcDto.taxPercentage ?? existingAmc.taxPercentage,
      billingPeriod: updateAmcDto.billingPeriod ?? existingAmc.billingPeriod,
    });

    try {
      const amc = await this.prismaService.amc.update({
        where: {
          id: amcId,
        },
        data: normalized,
        select: amcSelect,
      });

      return this.toApiAmc(amc);
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'AMC number must be unique');
    }
  }

  async deleteAmc(amcId: string) {
    await this.getAmcOrThrow(amcId);

    const linkedInvoiceCount = await this.prismaService.amcInvoice.count({
      where: {
        amcId,
      },
    });

    if (linkedInvoiceCount > 0) {
      throw new BadRequestException(
        'AMC records linked to invoices cannot be deleted',
      );
    }

    const amc = await this.prismaService.amc.delete({
      where: {
        id: amcId,
      },
      select: amcSelect,
    });

    return this.toApiAmc(amc);
  }

  async getDashboardSummary() {
    await this.expirePastContracts();

    const today = this.toDateOnly(new Date());
    const nextThirtyDays = this.addDays(today, 30);

    const [activeCount, expiringSoonCount, expiredCount, paymentDueCount, overduePaymentCount] =
      await Promise.all([
        this.prismaService.amc.count({
          where: {
            status: AmcStatus.ACTIVE,
          },
        }),
        this.prismaService.amc.count({
          where: {
            status: AmcStatus.ACTIVE,
            endDate: {
              gte: today,
              lte: nextThirtyDays,
            },
          },
        }),
        this.prismaService.amc.count({
          where: {
            status: AmcStatus.EXPIRED,
          },
        }),
        this.prismaService.amc.count({
          where: {
            status: AmcStatus.ACTIVE,
            nextBillingDate: {
              lte: nextThirtyDays,
            },
          },
        }),
        this.prismaService.amc.count({
          where: {
            status: AmcStatus.ACTIVE,
            nextBillingDate: {
              lt: today,
            },
          },
        }),
      ]);

    return {
      activeCount,
      expiringSoonCount,
      expiredCount,
      paymentDueCount,
      overduePaymentCount,
    };
  }

  async createInvoiceForAmc(amcId: string) {
    await this.expirePastContracts();

    const amc = await this.getAmcOrThrow(amcId);

    if (amc.status === AmcStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled AMC contracts cannot generate invoices',
      );
    }

    const billingPeriodStart = this.toDateOnly(
      amc.nextBillingDate ?? amc.startDate,
    );

    if (billingPeriodStart > this.toDateOnly(amc.endDate)) {
      throw new BadRequestException(
        'All AMC billing periods have already been invoiced',
      );
    }

    const tentativePeriodEnd = this.subtractDays(
      this.addMonths(billingPeriodStart, amc.billingPeriodMonths),
      1,
    );
    const billingPeriodEnd =
      tentativePeriodEnd > amc.endDate ? this.toDateOnly(amc.endDate) : tentativePeriodEnd;

    const existingInvoiceLink = amc.invoices.find(
      (invoice) =>
        invoice.billingPeriodStart.getTime() === billingPeriodStart.getTime() &&
        invoice.billingPeriodEnd.getTime() === billingPeriodEnd.getTime(),
    );

    if (existingInvoiceLink) {
      throw new ConflictException(
        'An invoice already exists for the current AMC billing period',
      );
    }

    const billedMonths = this.calculateDurationMonths(
      billingPeriodStart,
      billingPeriodEnd,
    );
    const periodAmount = this.roundCurrency(
      (amc.contractAmount / amc.durationMonths) * billedMonths,
    );
    const cgstPercentage = this.roundCurrency(amc.taxPercentage / 2);
    const sgstPercentage = this.roundCurrency(amc.taxPercentage - cgstPercentage);
    const cgstAmount = this.roundCurrency(
      (periodAmount * cgstPercentage) / 100,
    );
    const sgstAmount = this.roundCurrency(
      (periodAmount * sgstPercentage) / 100,
    );
    const totalTaxAmount = this.roundCurrency(cgstAmount + sgstAmount);
    const totalAmount = this.roundCurrency(periodAmount + totalTaxAmount);
    const invoiceDate = this.toDateOnly(new Date());
    const nextBillingDateCandidate = this.addMonths(
      billingPeriodStart,
      amc.billingPeriodMonths,
    );
    const nextBillingDate =
      nextBillingDateCandidate > amc.endDate ? null : nextBillingDateCandidate;
    const companySettings = await this.companySettingsService.getCompanySettings();
    const defaultAmcTerms = companySettings?.amcTermsAndConditions?.trim();
    const periodTerms = `AMC billing period ${this.formatDate(billingPeriodStart)} to ${this.formatDate(billingPeriodEnd)}`;
    const amcTermsAndConditions = defaultAmcTerms
      ? `${defaultAmcTerms}\n\n${periodTerms}`
      : periodTerms;

    const result = await this.prismaService.$transaction(async (transaction) => {
      const invoiceNumber = await this.generateNextInvoiceNumber(
        InvoiceType.TAX,
        transaction,
        invoiceDate,
      );

      const createdInvoice = await transaction.invoice.create({
        data: {
          invoiceType: InvoiceType.TAX,
          invoiceNumber,
          invoiceDate,
          supplierId: amc.branchId,
          customerId: amc.customerId,
          customerName: amc.customerName,
          customerAddress: amc.customer.billingAddress ?? amc.customer.address,
          customerGstin: amc.customer.gstin ?? '',
          placeOfSupply: amc.customer.placeOfSupply ?? '',
          notes: amc.note ?? undefined,
          termsAndConditions: amcTermsAndConditions,
          totalBeforeTax: periodAmount,
          totalTaxAmount,
          roundedOff: 0,
          totalAmount,
          amountDue: totalAmount,
          status: InvoiceStatus.ISSUED,
          lineItems: {
            create: [
              {
                productServiceName: `AMC - ${amc.customerName}`,
                description: `AMC coverage for ${this.formatDate(billingPeriodStart)} to ${this.formatDate(billingPeriodEnd)}`,
                hsnSac: '998719',
                quantity: 1,
                unitPrice: periodAmount,
                cgstAmount,
                cgstPercentage,
                sgstAmount,
                sgstPercentage,
                lineAmount: totalAmount,
              },
            ],
          },
        },
        select: {
          id: true,
          invoiceType: true,
          invoiceNumber: true,
          invoiceDate: true,
          totalAmount: true,
          amountDue: true,
          status: true,
        },
      });

      await this.outstandingsService.syncOutstandingForInvoice(
        {
          amountDue: createdInvoice.amountDue,
          customerId: amc.customerId,
          customerName: amc.customerName,
          id: createdInvoice.id,
          invoiceDate: createdInvoice.invoiceDate,
          invoiceNumber: createdInvoice.invoiceNumber,
          invoiceType: createdInvoice.invoiceType,
          totalAmount: createdInvoice.totalAmount,
        },
        transaction,
      );

      await transaction.amcInvoice.create({
        data: {
          amcId: amc.id,
          invoiceId: createdInvoice.id,
          billingPeriodStart,
          billingPeriodEnd,
        },
      });

      const updatedAmc = await transaction.amc.update({
        where: {
          id: amc.id,
        },
        data: {
          lastPaidDate: invoiceDate,
          nextBillingDate,
          status:
            nextBillingDate === null && this.toDateOnly(amc.endDate) < invoiceDate
              ? AmcStatus.EXPIRED
              : this.resolveStatus(
                  nextBillingDate ? nextBillingDate.toISOString() : undefined,
                  amc.endDate.toISOString(),
                  amc.status,
                ),
        },
        select: amcSelect,
      });

      return {
        amc: this.toApiAmc(updatedAmc),
        invoice: this.toApiInvoiceSummary(createdInvoice),
      };
    });

    return result;
  }

  async getAmcPdf(amcId: string): Promise<{ amcNumber: string; pdfBuffer: Buffer }> {
    const amc = await this.getAmcOrThrow(amcId);
    const company = await this.companySettingsService.getCompanyBranding();
    const document = new PDFDocument({
      size: 'A4',
      margin: 40,
    });
    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const completed = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
    });

    const brandColor = '#3D6B86';
    const pageWidth = document.page.width - 80;
    let cursorY = 40;

    if (company?.logoFilePath && existsSync(company.logoFilePath)) {
      document.image(company.logoFilePath, 40, cursorY, {
        fit: [110, 60],
      });
    } else {
      document
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(brandColor)
        .text(company?.companyName || amc.branch.supplierName, 40, cursorY, {
          width: 250,
        });
    }

    document
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(brandColor)
      .text('ANNUAL MAINTENANCE CONTRACT', 40, cursorY, {
        width: pageWidth,
        align: 'right',
      });
    document
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#333333')
      .text(amc.amcNumber, 40, cursorY + 30, {
        width: pageWidth,
        align: 'right',
      });

    cursorY += 84;

    document
      .moveTo(40, cursorY)
      .lineTo(40 + pageWidth, cursorY)
      .lineWidth(1)
      .strokeColor(brandColor)
      .stroke();

    cursorY += 18;

    this.drawPdfSection(
      document,
      'Customer',
      [
        `Name: ${amc.customerName}`,
        `Phone: ${amc.customer.phone}`,
        `Address: ${amc.customer.billingAddress ?? amc.customer.address}`,
        `GSTIN: ${amc.customer.gstin ?? '-'}`,
      ],
      40,
      cursorY,
      250,
    );

    this.drawPdfSection(
      document,
      'Branch',
      [
        `Name: ${amc.branch.supplierName}`,
        `Phone: ${amc.branch.phone}`,
        `Email: ${amc.branch.email}`,
        `GSTIN: ${amc.branch.gstin}`,
      ],
      320,
      cursorY,
      220,
    );

    cursorY += 120;

    this.drawPdfTable(
      document,
      40,
      cursorY,
      pageWidth,
      [
        ['AMC Number', amc.amcNumber],
        ['Contract Period', `${this.formatDate(amc.startDate)} to ${this.formatDate(amc.endDate)}`],
        ['Duration', `${amc.durationMonths} month(s)`],
        ['Billing Period', `${this.billingPeriodLabel(amc.billingPeriod)} (${amc.billingPeriodMonths} month cycle)`],
        ['Contract Amount', this.formatCurrency(amc.contractAmount)],
        ['Tax Percentage', `${this.formatNumber(amc.taxPercentage)}%`],
        ['Status', amc.status],
        ['Last Paid Date', amc.lastPaidDate ? this.formatDate(amc.lastPaidDate) : '-'],
        ['Next Billing Date', amc.nextBillingDate ? this.formatDate(amc.nextBillingDate) : '-'],
      ],
    );

    cursorY += 240;

    document
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(brandColor)
      .text('Notes / Terms', 40, cursorY);
    document
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#222222')
      .text(amc.note?.trim() || 'No additional contract terms provided.', 40, cursorY + 20, {
        width: pageWidth,
        lineGap: 3,
      });

    document.end();

    return {
      amcNumber: amc.amcNumber,
      pdfBuffer: await completed,
    };
  }

  private async getAmcOrThrow(amcId: string): Promise<AmcRecord> {
    const amc = await this.prismaService.amc.findUnique({
      where: {
        id: amcId,
      },
      select: amcSelect,
    });

    if (!amc) {
      throw new NotFoundException('AMC not found');
    }

    return amc;
  }

  private async ensureBranchExists(branchId: string): Promise<void> {
    const branch = await this.prismaService.supplier.findUnique({
      where: {
        id: branchId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  private async getCustomerOrThrow(customerId: string) {
    const customer = await this.prismaService.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private normalizeCreateInput(input: {
    amcNumber: string;
    customerId: string;
    customerName: string;
    branchId: string;
    startDate: string;
    endDate: string;
    billingPeriod: AmcBillingPeriod;
    contractAmount: number;
    taxPercentage: number;
    status?: AmcStatus;
    lastPaidDate?: string | null;
    nextBillingDate?: string | null;
    note?: string;
  }): Prisma.AmcUncheckedCreateInput {
    const normalized = this.normalizePayloadFields(input, true);

    return {
      amcNumber: normalized.amcNumber,
      customerId: normalized.customerId,
      customerName: normalized.customerName,
      branchId: normalized.branchId,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      durationMonths: normalized.durationMonths,
      billingPeriod: normalized.billingPeriod,
      billingPeriodMonths: normalized.billingPeriodMonths,
      contractAmount: normalized.contractAmount,
      taxPercentage: normalized.taxPercentage,
      status: normalized.status,
      lastPaidDate: normalized.lastPaidDate,
      nextBillingDate: normalized.nextBillingDate,
      note: normalized.note,
    };
  }

  private normalizeUpdateInput(input: {
    amcNumber: string;
    customerId: string;
    customerName: string;
    branchId: string;
    startDate: string;
    endDate: string;
    billingPeriod: AmcBillingPeriod;
    contractAmount: number;
    taxPercentage: number;
    status?: AmcStatus;
    lastPaidDate?: string | null;
    nextBillingDate?: string | null;
    note?: string;
  }): Prisma.AmcUncheckedUpdateInput {
    return this.normalizePayloadFields(input, false);
  }

  private normalizePayloadFields(
    input: {
      amcNumber: string;
      customerId: string;
      customerName: string;
      branchId: string;
      startDate: string;
      endDate: string;
      billingPeriod: AmcBillingPeriod;
      contractAmount: number;
      taxPercentage: number;
      status?: AmcStatus;
      lastPaidDate?: string | null;
      nextBillingDate?: string | null;
      note?: string;
    },
    useDefaultNextBillingDate: boolean,
  ): NormalizedAmcPayload {
    const startDate = this.toDateOnly(new Date(input.startDate));
    const endDate = this.toDateOnly(new Date(input.endDate));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid AMC start or end date');
    }

    if (startDate > endDate) {
      throw new BadRequestException('AMC end date must be on or after the start date');
    }

    const durationMonths = this.calculateDurationMonths(startDate, endDate);
    const billingPeriodMonths = this.resolveBillingPeriodMonths(input.billingPeriod);

    if (durationMonths < billingPeriodMonths) {
      throw new BadRequestException(
        'AMC duration must be at least one full billing period',
      );
    }

    return {
      amcNumber: input.amcNumber.trim(),
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      branchId: input.branchId,
      startDate,
      endDate,
      durationMonths,
      billingPeriod: input.billingPeriod,
      billingPeriodMonths,
      contractAmount: this.roundCurrency(input.contractAmount),
      taxPercentage: this.roundCurrency(input.taxPercentage),
      status: this.resolveStatus(
        input.nextBillingDate,
        input.endDate,
        input.status,
      ),
      lastPaidDate:
        input.lastPaidDate === undefined
          ? null
          : input.lastPaidDate
            ? this.toDateOnly(new Date(input.lastPaidDate))
            : null,
      nextBillingDate:
        input.nextBillingDate === undefined
          ? useDefaultNextBillingDate
            ? startDate
            : null
          : input.nextBillingDate
            ? this.toDateOnly(new Date(input.nextBillingDate))
            : null,
      note: input.note?.trim() || null,
    };
  }

  private resolveStatus(
    nextBillingDate: string | null | undefined,
    endDate: string,
    requestedStatus?: AmcStatus,
  ): AmcStatus {
    if (requestedStatus === AmcStatus.CANCELLED) {
      return AmcStatus.CANCELLED;
    }

    const today = this.toDateOnly(new Date());
    const endDateOnly = this.toDateOnly(new Date(endDate));

    if (endDateOnly < today) {
      return AmcStatus.EXPIRED;
    }

    if (nextBillingDate) {
      const nextBillingDateOnly = this.toDateOnly(new Date(nextBillingDate));
      if (Number.isNaN(nextBillingDateOnly.getTime())) {
        throw new BadRequestException('Invalid next billing date');
      }
    }

    return AmcStatus.ACTIVE;
  }

  private async expirePastContracts(): Promise<void> {
    const today = this.toDateOnly(new Date());

    await this.prismaService.amc.updateMany({
      where: {
        status: AmcStatus.ACTIVE,
        endDate: {
          lt: today,
        },
      },
      data: {
        status: AmcStatus.EXPIRED,
      },
    });
  }

  private toApiAmc(amc: AmcRecord) {
    return {
      id: amc.id,
      amcNumber: amc.amcNumber,
      customerId: amc.customerId,
      customerName: amc.customerName,
      branchId: amc.branchId,
      startDate: amc.startDate,
      endDate: amc.endDate,
      durationMonths: amc.durationMonths,
      billingPeriod: amc.billingPeriod,
      billingPeriodMonths: amc.billingPeriodMonths,
      contractAmount: amc.contractAmount,
      taxPercentage: amc.taxPercentage,
      status: amc.status,
      lastPaidDate: amc.lastPaidDate,
      nextBillingDate: amc.nextBillingDate,
      note: amc.note,
      createdAt: amc.createdAt,
      updatedAt: amc.updatedAt,
      customer: {
        id: amc.customer.id,
        customerName: amc.customer.name,
        phone: amc.customer.phone,
        email: amc.customer.email,
        gstin: amc.customer.gstin,
        billingAddress: amc.customer.billingAddress ?? amc.customer.address,
        shippingAddress:
          amc.customer.shippingAddress ??
          amc.customer.billingAddress ??
          amc.customer.address,
        placeOfSupply: amc.customer.placeOfSupply,
        address: amc.customer.address,
        latitude: amc.customer.latitude,
        longitude: amc.customer.longitude,
        status: amc.customer.status,
        createdAt: amc.customer.createdAt,
        updatedAt: amc.customer.updatedAt,
      },
      branch: amc.branch,
      invoices: [...amc.invoices]
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime(),
        )
        .map((invoice) => ({
          id: invoice.id,
          invoiceId: invoice.invoiceId,
          billingPeriodStart: invoice.billingPeriodStart,
          billingPeriodEnd: invoice.billingPeriodEnd,
          createdAt: invoice.createdAt,
          invoice: this.toApiInvoiceSummary(invoice.invoice),
        })),
    };
  }

  private toApiInvoiceSummary(invoice: MinimalInvoiceRecord) {
    return {
      id: invoice.id,
      invoiceType: invoice.invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      status: invoice.status,
    };
  }

  private resolveBillingPeriodMonths(billingPeriod: AmcBillingPeriod): number {
    switch (billingPeriod) {
      case AmcBillingPeriod.QUARTERLY:
        return 3;
      case AmcBillingPeriod.HALF_YEARLY:
        return 6;
      default:
        return 12;
    }
  }

  private calculateDurationMonths(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const totalMonths = yearDiff * 12 + monthDiff;

    return totalMonths + (endDate.getDate() >= startDate.getDate() ? 1 : 0);
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const originalDay = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDayOfMonth = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();
    result.setDate(Math.min(originalDay, lastDayOfMonth));
    return this.toDateOnly(result);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return this.toDateOnly(result);
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return this.toDateOnly(result);
  }

  private toDateOnly(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private async generateNextInvoiceNumber(
    invoiceType: InvoiceType,
    prisma: Prisma.TransactionClient,
    invoiceDate: Date,
  ): Promise<string> {
    const year = invoiceDate.getFullYear();
    const prefix = `${invoiceType === InvoiceType.TAX ? 'TAX' : 'PF'}-${year}-`;
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

  private drawPdfSection(
    document: PDFKit.PDFDocument,
    title: string,
    lines: string[],
    x: number,
    y: number,
    width: number,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#3D6B86')
      .text(title, x, y, {
        width,
      });
    document
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#222222')
      .text(lines.join('\n'), x, y + 20, {
        width,
        lineGap: 3,
      });
  }

  private drawPdfTable(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    rows: Array<[string, string]>,
  ): void {
    const labelWidth = 170;
    const rowHeight = 24;

    rows.forEach(([label, value], index) => {
      const rowY = y + index * rowHeight;
      const fillColor = index % 2 === 0 ? '#F6F9FB' : '#FFFFFF';

      document
        .save()
        .lineWidth(1)
        .strokeColor('#3D6B86')
        .fillColor(fillColor)
        .rect(x, rowY, width, rowHeight)
        .fillAndStroke(fillColor, '#3D6B86')
        .restore();

      document
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#3D6B86')
        .text(label, x + 10, rowY + 7, {
          width: labelWidth - 20,
        });
      document
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor('#111111')
        .text(value, x + labelWidth, rowY + 7, {
          width: width - labelWidth - 10,
        });
    });
  }

  private billingPeriodLabel(billingPeriod: AmcBillingPeriod): string {
    switch (billingPeriod) {
      case AmcBillingPeriod.QUARTERLY:
        return 'Quarterly';
      case AmcBillingPeriod.HALF_YEARLY:
        return 'Half yearly';
      default:
        return 'Yearly';
    }
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private formatCurrency(value: number): string {
    return `Rs. ${this.formatNumber(value)}`;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private rethrowUniqueConstraint(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
