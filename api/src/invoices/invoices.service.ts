import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { createPaginationMeta, normalizePagination } from '../common/utils/pagination.util';
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
  constructor(private readonly prismaService: PrismaService) {}

  async listInvoices(query: ListInvoicesQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.InvoiceWhereInput = {
      ...(query.type ? { invoiceType: query.type } : {}),
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

  async getInvoiceById(invoiceId: string): Promise<InvoiceRecord> {
    return this.getInvoiceOrThrow(invoiceId);
  }

  async getInvoiceByIdAndType(
    invoiceId: string,
    invoiceType: 'PROFORMA' | 'TAX',
  ): Promise<InvoiceRecord> {
    const invoice = await this.getInvoiceOrThrow(invoiceId);

    if (invoice.invoiceType !== invoiceType) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async createInvoice(
    createInvoiceDto: CreateInvoiceDto,
  ): Promise<InvoiceRecord> {
    await this.ensureSupplierExists(createInvoiceDto.supplierId);
    await this.ensureCustomerExists(createInvoiceDto.customerId);

    try {
      return await this.prismaService.invoice.create({
        data: {
          invoiceType: createInvoiceDto.invoiceType,
          invoiceNumber: createInvoiceDto.invoiceNumber,
          invoiceDate: new Date(createInvoiceDto.invoiceDate),
          supplierId: createInvoiceDto.supplierId,
          customerId: createInvoiceDto.customerId,
          customerName: createInvoiceDto.customerName,
          customerAddress: createInvoiceDto.customerAddress,
          customerGstin: createInvoiceDto.customerGstin,
          placeOfSupply: createInvoiceDto.placeOfSupply,
          notes: createInvoiceDto.notes,
          termsAndConditions: createInvoiceDto.termsAndConditions,
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
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Invoice number must be unique');
    }
  }

  async updateInvoice(
    invoiceId: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceRecord> {
    await this.getInvoiceOrThrow(invoiceId);

    if (updateInvoiceDto.supplierId) {
      await this.ensureSupplierExists(updateInvoiceDto.supplierId);
    }

    if (updateInvoiceDto.customerId) {
      await this.ensureCustomerExists(updateInvoiceDto.customerId);
    }

    try {
      return await this.prismaService.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          invoiceType: updateInvoiceDto.invoiceType,
          invoiceNumber: updateInvoiceDto.invoiceNumber,
          invoiceDate: updateInvoiceDto.invoiceDate
            ? new Date(updateInvoiceDto.invoiceDate)
            : undefined,
          supplierId: updateInvoiceDto.supplierId,
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
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Invoice number must be unique');
    }
  }

  async deleteInvoice(invoiceId: string): Promise<InvoiceRecord> {
    await this.getInvoiceOrThrow(invoiceId);

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
  ): Promise<InvoiceRecord> {
    await this.getInvoiceByIdAndType(invoiceId, invoiceType);
    return this.deleteInvoice(invoiceId);
  }

  private async getInvoiceOrThrow(invoiceId: string): Promise<InvoiceRecord> {
    const invoice = await this.prismaService.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      select: invoiceSelect,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
