import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductServiceHistoryAction,
  ProductServiceStatus,
} from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductServiceDto } from './dto/create-product-service.dto';
import { ListProductServicesQueryDto } from './dto/list-product-services-query.dto';
import { UpdateProductServiceDto } from './dto/update-product-service.dto';

const productServiceSelect =
  Prisma.validator<Prisma.ProductServiceSelect>()({
    id: true,
    name: true,
    type: true,
    description: true,
    hsnSacCode: true,
    unit: true,
    defaultRate: true,
    taxPercentage: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  });

const productServiceHistorySelect =
  Prisma.validator<Prisma.ProductServiceHistorySelect>()({
    id: true,
    productServiceId: true,
    productServiceName: true,
    action: true,
    oldValue: true,
    newValue: true,
    note: true,
    changedById: true,
    changedByName: true,
    createdAt: true,
  });

type ProductServiceRecord = Prisma.ProductServiceGetPayload<{
  select: typeof productServiceSelect;
}>;

type ProductServiceHistoryRecord = Prisma.ProductServiceHistoryGetPayload<{
  select: typeof productServiceHistorySelect;
}>;

type ProductServiceSnapshot = {
  name: string;
  type: ProductServiceRecord['type'];
  description: string;
  hsnSacCode: string;
  unit: string;
  defaultRate: number;
  taxPercentage: number;
  status: ProductServiceRecord['status'];
};

type HistoryEntry = {
  action: ProductServiceHistoryAction;
  oldValue: Prisma.InputJsonValue | null;
  newValue: Prisma.InputJsonValue | null;
  note: string;
};

@Injectable()
export class ProductServicesService {
  constructor(private readonly prismaService: PrismaService) {}

  async listProductServices(query: ListProductServicesQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const where: Prisma.ProductServiceWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.hsnSacCode?.trim()
        ? {
            hsnSacCode: {
              contains: query.hsnSacCode.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                hsnSacCode: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, productServices] = await Promise.all([
      this.prismaService.productService.count({ where }),
      this.prismaService.productService.findMany({
        where,
        orderBy: [{ status: 'asc' }, { type: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
        select: productServiceSelect,
      }),
    ]);

    return {
      data: productServices,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getProductServiceById(
    productServiceId: string,
  ): Promise<ProductServiceRecord> {
    return this.getProductServiceOrThrow(productServiceId);
  }

  async getProductServiceHistory(
    productServiceId: string,
  ): Promise<ProductServiceHistoryRecord[]> {
    await this.getProductServiceOrThrow(productServiceId);

    return this.prismaService.productServiceHistory.findMany({
      where: {
        productServiceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: productServiceHistorySelect,
    });
  }

  async createProductService(
    createProductServiceDto: CreateProductServiceDto,
    currentUser: JwtPayload,
  ): Promise<ProductServiceRecord> {
    return this.prismaService.$transaction(async (transaction) => {
      const createdProductService = await transaction.productService.create({
        data: this.buildCreateData(createProductServiceDto),
        select: productServiceSelect,
      });

      await transaction.productServiceHistory.create({
        data: this.toHistoryCreateInput(
          createdProductService.id,
          createdProductService.name,
          currentUser,
          {
            action: ProductServiceHistoryAction.CREATE,
            oldValue: null,
            newValue: this.toJsonValue(
              this.toSnapshot(createdProductService),
            ),
            note: 'Product or service created.',
          },
        ),
      });

      return createdProductService;
    });
  }

  async updateProductService(
    productServiceId: string,
    updateProductServiceDto: UpdateProductServiceDto,
    currentUser: JwtPayload,
  ): Promise<ProductServiceRecord> {
    const existingProductService = await this.getProductServiceOrThrow(
      productServiceId,
    );
    const updateData = this.buildUpdateData(updateProductServiceDto);

    return this.prismaService.$transaction(async (transaction) => {
      const updatedProductService = await transaction.productService.update({
        where: {
          id: productServiceId,
        },
        data: updateData,
        select: productServiceSelect,
      });

      const historyEntries = this.buildUpdateHistoryEntries(
        existingProductService,
        updatedProductService,
      );

      if (historyEntries.length > 0) {
        await transaction.productServiceHistory.createMany({
          data: historyEntries.map((entry) =>
            this.toHistoryCreateInput(
              updatedProductService.id,
              updatedProductService.name,
              currentUser,
              entry,
            ),
          ),
        });
      }

      return updatedProductService;
    });
  }

  async deleteProductService(
    productServiceId: string,
    currentUser: JwtPayload,
  ): Promise<ProductServiceRecord> {
    const existingProductService = await this.getProductServiceOrThrow(
      productServiceId,
    );

    const linkedLeadCount = await this.prismaService.lead.count({
      where: {
        interestedProductServiceId: productServiceId,
      },
    });

    if (linkedLeadCount > 0) {
      throw new BadRequestException(
        'Products or services linked to leads cannot be deleted',
      );
    }

    return this.prismaService.$transaction(async (transaction) => {
      await transaction.productServiceHistory.create({
        data: this.toHistoryCreateInput(
          existingProductService.id,
          existingProductService.name,
          currentUser,
          {
            action: ProductServiceHistoryAction.DELETE,
            oldValue: this.toJsonValue(this.toSnapshot(existingProductService)),
            newValue: null,
            note: 'Product or service deleted from the master list.',
          },
        ),
      });

      return transaction.productService.delete({
        where: {
          id: productServiceId,
        },
        select: productServiceSelect,
      });
    });
  }

  private async getProductServiceOrThrow(
    productServiceId: string,
  ): Promise<ProductServiceRecord> {
    const productService = await this.prismaService.productService.findUnique({
      where: {
        id: productServiceId,
      },
      select: productServiceSelect,
    });

    if (!productService) {
      throw new NotFoundException('Product or service not found');
    }

    return productService;
  }

  private buildCreateData(
    createProductServiceDto: CreateProductServiceDto,
  ): Prisma.ProductServiceCreateInput {
    return {
      name: createProductServiceDto.name.trim(),
      type: createProductServiceDto.type,
      description: createProductServiceDto.description.trim(),
      hsnSacCode: createProductServiceDto.hsnSacCode.trim().toUpperCase(),
      unit: createProductServiceDto.unit.trim(),
      defaultRate: createProductServiceDto.defaultRate,
      taxPercentage: createProductServiceDto.taxPercentage,
      status: createProductServiceDto.status ?? ProductServiceStatus.ACTIVE,
    };
  }

  private buildUpdateData(
    updateProductServiceDto: UpdateProductServiceDto,
  ): Prisma.ProductServiceUpdateInput {
    return {
      ...(updateProductServiceDto.name !== undefined
        ? {
            name: updateProductServiceDto.name.trim(),
          }
        : {}),
      ...(updateProductServiceDto.type !== undefined
        ? {
            type: updateProductServiceDto.type,
          }
        : {}),
      ...(updateProductServiceDto.description !== undefined
        ? {
            description: updateProductServiceDto.description.trim(),
          }
        : {}),
      ...(updateProductServiceDto.hsnSacCode !== undefined
        ? {
            hsnSacCode: updateProductServiceDto.hsnSacCode.trim().toUpperCase(),
          }
        : {}),
      ...(updateProductServiceDto.unit !== undefined
        ? {
            unit: updateProductServiceDto.unit.trim(),
          }
        : {}),
      ...(updateProductServiceDto.defaultRate !== undefined
        ? {
            defaultRate: updateProductServiceDto.defaultRate,
          }
        : {}),
      ...(updateProductServiceDto.taxPercentage !== undefined
        ? {
            taxPercentage: updateProductServiceDto.taxPercentage,
          }
        : {}),
      ...(updateProductServiceDto.status !== undefined
        ? {
            status: updateProductServiceDto.status,
          }
        : {}),
    };
  }

  private buildUpdateHistoryEntries(
    previousProductService: ProductServiceRecord,
    nextProductService: ProductServiceRecord,
  ): HistoryEntry[] {
    const historyEntries: HistoryEntry[] = [];

    const detailFieldKeys: Array<keyof ProductServiceSnapshot> = [
      'name',
      'type',
      'description',
      'hsnSacCode',
      'unit',
    ];

    const detailChanges = this.buildFieldDiff(
      previousProductService,
      nextProductService,
      detailFieldKeys,
    );

    if (
      Object.keys(detailChanges.oldValue).length > 0 &&
      Object.keys(detailChanges.newValue).length > 0
    ) {
      const changedLabels = Object.keys(detailChanges.newValue).map((key) =>
        this.fieldLabel(key),
      );

      historyEntries.push({
        action: ProductServiceHistoryAction.EDIT,
        oldValue: this.toJsonValue(detailChanges.oldValue),
        newValue: this.toJsonValue(detailChanges.newValue),
        note: `Updated ${changedLabels.join(', ')}.`,
      });
    }

    if (previousProductService.defaultRate !== nextProductService.defaultRate) {
      historyEntries.push({
        action: ProductServiceHistoryAction.RATE_CHANGE,
        oldValue: this.toJsonValue({
          defaultRate: previousProductService.defaultRate,
        }),
        newValue: this.toJsonValue({
          defaultRate: nextProductService.defaultRate,
        }),
        note: `Default rate changed from ${previousProductService.defaultRate} to ${nextProductService.defaultRate}.`,
      });
    }

    if (
      previousProductService.taxPercentage !== nextProductService.taxPercentage
    ) {
      historyEntries.push({
        action: ProductServiceHistoryAction.TAX_CHANGE,
        oldValue: this.toJsonValue({
          taxPercentage: previousProductService.taxPercentage,
        }),
        newValue: this.toJsonValue({
          taxPercentage: nextProductService.taxPercentage,
        }),
        note: `Tax percentage changed from ${previousProductService.taxPercentage}% to ${nextProductService.taxPercentage}%.`,
      });
    }

    if (previousProductService.status !== nextProductService.status) {
      historyEntries.push({
        action:
          nextProductService.status === ProductServiceStatus.INACTIVE
            ? ProductServiceHistoryAction.DEACTIVATE
            : ProductServiceHistoryAction.STATUS_CHANGE,
        oldValue: this.toJsonValue({
          status: previousProductService.status,
        }),
        newValue: this.toJsonValue({
          status: nextProductService.status,
        }),
        note:
          nextProductService.status === ProductServiceStatus.INACTIVE
            ? 'Product or service deactivated.'
            : `Status changed from ${previousProductService.status} to ${nextProductService.status}.`,
      });
    }

    return historyEntries;
  }

  private buildFieldDiff(
    previousProductService: ProductServiceRecord,
    nextProductService: ProductServiceRecord,
    fields: Array<keyof ProductServiceSnapshot>,
  ): {
    oldValue: Record<string, string>;
    newValue: Record<string, string>;
  } {
    const oldValue: Record<string, string> = {};
    const newValue: Record<string, string> = {};

    for (const field of fields) {
      const previousValue = String(previousProductService[field]);
      const nextValue = String(nextProductService[field]);

      if (previousValue !== nextValue) {
        oldValue[field] = previousValue;
        newValue[field] = nextValue;
      }
    }

    return { oldValue, newValue };
  }

  private toSnapshot(
    productService: ProductServiceRecord,
  ): ProductServiceSnapshot {
    return {
      name: productService.name,
      type: productService.type,
      description: productService.description,
      hsnSacCode: productService.hsnSacCode,
      unit: productService.unit,
      defaultRate: productService.defaultRate,
      taxPercentage: productService.taxPercentage,
      status: productService.status,
    };
  }

  private toHistoryCreateInput(
    productServiceId: string,
    productServiceName: string,
    currentUser: JwtPayload,
    entry: HistoryEntry,
  ): Prisma.ProductServiceHistoryUncheckedCreateInput {
    return {
      productServiceId,
      productServiceName,
      action: entry.action,
      oldValue: entry.oldValue ?? Prisma.DbNull,
      newValue: entry.newValue ?? Prisma.DbNull,
      note: entry.note,
      changedById: currentUser.sub,
      changedByName: currentUser.name,
    };
  }

  private toJsonValue(
    value: Record<string, string | number>,
  ): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private fieldLabel(field: string): string {
    switch (field) {
      case 'hsnSacCode':
        return 'HSN / SAC Code';
      default:
        return field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (letter) => letter.toUpperCase());
    }
  }
}
