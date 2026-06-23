import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InvoiceType,
  OutstandingStatus,
  Prisma,
} from '@prisma/client';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListOutstandingsQueryDto } from './dto/list-outstandings-query.dto';
import { UpdateOutstandingDto } from './dto/update-outstanding.dto';

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
});

type OutstandingRecord = Prisma.OutstandingGetPayload<{
  select: typeof outstandingSelect;
}>;

type OutstandingInvoiceSyncInput = {
  amountDue?: number | null;
  customerId: string;
  customerName: string;
  id: string;
  invoiceDate: Date;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  totalAmount: number;
};

type OutstandingDbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class OutstandingsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listOutstandings(query: ListOutstandingsQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.OutstandingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.invoiceType ? { invoiceType: query.invoiceType } : {}),
      ...(query.fromDate || query.toDate
        ? {
            invoiceDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
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
                note: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, outstandings] = await Promise.all([
      this.prismaService.outstanding.count({ where }),
      this.prismaService.outstanding.findMany({
        where,
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: outstandingSelect,
      }),
    ]);

    return {
      data: outstandings,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getOutstandingById(outstandingId: string): Promise<OutstandingRecord> {
    return this.getOutstandingOrThrow(outstandingId);
  }

  async updateOutstanding(
    outstandingId: string,
    updateOutstandingDto: UpdateOutstandingDto,
  ): Promise<OutstandingRecord> {
    const outstanding = await this.getOutstandingOrThrow(outstandingId);

    const paidAmount = this.roundCurrency(
      updateOutstandingDto.paidAmount ?? outstanding.paidAmount,
    );
    const creditAmount = this.roundCurrency(
      updateOutstandingDto.creditAmount ?? outstanding.creditAmount,
    );
    const dueDate = updateOutstandingDto.dueDate
      ? new Date(updateOutstandingDto.dueDate)
      : outstanding.dueDate;
    const outstandingAmount = this.roundCurrency(
      outstanding.totalAmount - paidAmount - creditAmount,
    );
    const status = this.resolveStatus({
      dueDate,
      outstandingAmount,
      paidAmount,
      requestedStatus: updateOutstandingDto.status,
    });

    return this.prismaService.outstanding.update({
      where: {
        id: outstandingId,
      },
      data: {
        paidAmount,
        creditAmount,
        dueDate,
        outstandingAmount,
        status,
        note: updateOutstandingDto.note,
      },
      select: outstandingSelect,
    });
  }

  async deleteOutstanding(outstandingId: string): Promise<OutstandingRecord> {
    await this.getOutstandingOrThrow(outstandingId);

    return this.prismaService.outstanding.delete({
      where: {
        id: outstandingId,
      },
      select: outstandingSelect,
    });
  }

  async syncOutstandingForInvoice(
    invoice: OutstandingInvoiceSyncInput,
    prisma: OutstandingDbClient = this.prismaService,
  ): Promise<void> {
    const existingOutstanding = await prisma.outstanding.findUnique({
      where: {
        invoiceId: invoice.id,
      },
      select: {
        creditAmount: true,
        dueDate: true,
        id: true,
        note: true,
        paidAmount: true,
      },
    });

    if (!existingOutstanding) {
      const paidAmount = this.roundCurrency(
        Math.max(0, invoice.totalAmount - (invoice.amountDue ?? invoice.totalAmount)),
      );
      const creditAmount = 0;
      const dueDate = invoice.invoiceDate;
      const outstandingAmount = this.roundCurrency(
        invoice.totalAmount - paidAmount - creditAmount,
      );

      await prisma.outstanding.create({
        data: {
          invoiceId: invoice.id,
          invoiceType: invoice.invoiceType,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          invoiceDate: invoice.invoiceDate,
          dueDate,
          totalAmount: invoice.totalAmount,
          paidAmount,
          creditAmount,
          outstandingAmount,
          status: this.resolveStatus({
            dueDate,
            outstandingAmount,
            paidAmount,
          }),
        },
      });

      return;
    }

    const paidAmount = this.roundCurrency(existingOutstanding.paidAmount);
    const creditAmount = this.roundCurrency(existingOutstanding.creditAmount);
    const outstandingAmount = this.roundCurrency(
      invoice.totalAmount - paidAmount - creditAmount,
    );

    await prisma.outstanding.update({
      where: {
        invoiceId: invoice.id,
      },
      data: {
        invoiceType: invoice.invoiceType,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        outstandingAmount,
        status: this.resolveStatus({
          dueDate: existingOutstanding.dueDate,
          outstandingAmount,
          paidAmount,
        }),
        note: existingOutstanding.note,
      },
    });
  }

  private async getOutstandingOrThrow(
    outstandingId: string,
  ): Promise<OutstandingRecord> {
    const outstanding = await this.prismaService.outstanding.findUnique({
      where: {
        id: outstandingId,
      },
      select: outstandingSelect,
    });

    if (!outstanding) {
      throw new NotFoundException('Outstanding not found');
    }

    return outstanding;
  }

  private resolveStatus(input: {
    dueDate: Date;
    outstandingAmount: number;
    paidAmount: number;
    requestedStatus?: OutstandingStatus;
  }): OutstandingStatus {
    if (input.outstandingAmount <= 0) {
      return OutstandingStatus.PAID;
    }

    if (this.isPastDue(input.dueDate)) {
      return OutstandingStatus.OVERDUE;
    }

    if (
      input.requestedStatus === OutstandingStatus.PARTIAL &&
      input.paidAmount > 0
    ) {
      return OutstandingStatus.PARTIAL;
    }

    if (
      input.requestedStatus === OutstandingStatus.PENDING &&
      input.paidAmount === 0
    ) {
      return OutstandingStatus.PENDING;
    }

    if (input.paidAmount > 0) {
      return OutstandingStatus.PARTIAL;
    }

    return OutstandingStatus.PENDING;
  }

  private isPastDue(dueDate: Date): boolean {
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const dueDateOnly = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate(),
    );

    return dueDateOnly < todayOnly;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
