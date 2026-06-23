import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupplierStatus } from '@prisma/client';
import { createPaginationMeta, normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const supplierSelect = Prisma.validator<Prisma.SupplierSelect>()({
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
});

type SupplierRecord = Prisma.SupplierGetPayload<{
  select: typeof supplierSelect;
}>;

@Injectable()
export class SuppliersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listSuppliers(
    query: ListSuppliersQueryDto,
  ) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.SupplierWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.gstin?.trim()
        ? {
            gstin: {
              contains: query.gstin.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.phone?.trim()
        ? {
            phone: {
              contains: query.phone.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                supplierName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                gstin: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, suppliers] = await Promise.all([
      this.prismaService.supplier.count({ where }),
      this.prismaService.supplier.findMany({
        where,
        orderBy: [{ status: 'asc' }, { supplierName: 'asc' }],
        skip,
        take: limit,
        select: supplierSelect,
      }),
    ]);

    return {
      data: suppliers,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getSupplierById(supplierId: string): Promise<SupplierRecord> {
    return this.getSupplierOrThrow(supplierId);
  }

  async createSupplier(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierRecord> {
    try {
      return await this.prismaService.supplier.create({
        data: {
          supplierName: createSupplierDto.supplierName,
          phone: createSupplierDto.phone,
          email: createSupplierDto.email,
          gstin: createSupplierDto.gstin,
          address: createSupplierDto.address,
          bankName: createSupplierDto.bankName,
          accountNumber: createSupplierDto.accountNumber,
          ifscCode: createSupplierDto.ifscCode,
          status: createSupplierDto.status ?? SupplierStatus.ACTIVE,
        },
        select: supplierSelect,
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Supplier GSTIN must be unique');
    }
  }

  async updateSupplier(
    supplierId: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierRecord> {
    await this.getSupplierOrThrow(supplierId);

    try {
      return await this.prismaService.supplier.update({
        where: {
          id: supplierId,
        },
        data: {
          supplierName: updateSupplierDto.supplierName,
          phone: updateSupplierDto.phone,
          email: updateSupplierDto.email,
          gstin: updateSupplierDto.gstin,
          address: updateSupplierDto.address,
          bankName: updateSupplierDto.bankName,
          accountNumber: updateSupplierDto.accountNumber,
          ifscCode: updateSupplierDto.ifscCode,
          status: updateSupplierDto.status,
        },
        select: supplierSelect,
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Supplier GSTIN must be unique');
    }
  }

  async deleteSupplier(supplierId: string): Promise<SupplierRecord> {
    await this.getSupplierOrThrow(supplierId);

    const [linkedInvoiceCount, linkedQuotationCount, linkedAmcCount, linkedLeadCount] =
      await Promise.all([
        this.prismaService.invoice.count({
          where: {
            supplierId,
          },
        }),
        this.prismaService.quotation.count({
          where: {
            supplierId,
          },
        }),
        this.prismaService.amc.count({
          where: {
            branchId: supplierId,
          },
        }),
        this.prismaService.lead.count({
          where: {
            branchId: supplierId,
          },
        }),
      ]);

    if (
      linkedInvoiceCount > 0 ||
      linkedQuotationCount > 0 ||
      linkedAmcCount > 0 ||
      linkedLeadCount > 0
    ) {
      throw new BadRequestException(
        'Branches linked to invoices, quotations, AMC contracts, or leads cannot be deleted',
      );
    }

    return this.prismaService.supplier.delete({
      where: {
        id: supplierId,
      },
      select: supplierSelect,
    });
  }

  private async getSupplierOrThrow(
    supplierId: string,
  ): Promise<SupplierRecord> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: supplierSelect,
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
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
