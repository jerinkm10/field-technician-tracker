import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductServiceStatus,
} from '@prisma/client';
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

type ProductServiceRecord = Prisma.ProductServiceGetPayload<{
  select: typeof productServiceSelect;
}>;

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
        orderBy: [
          { status: 'asc' },
          { type: 'asc' },
          { name: 'asc' },
        ],
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

  async getProductServiceById(productServiceId: string): Promise<ProductServiceRecord> {
    return this.getProductServiceOrThrow(productServiceId);
  }

  async createProductService(
    createProductServiceDto: CreateProductServiceDto,
  ): Promise<ProductServiceRecord> {
    return this.prismaService.productService.create({
      data: {
        name: createProductServiceDto.name,
        type: createProductServiceDto.type,
        description: createProductServiceDto.description,
        hsnSacCode: createProductServiceDto.hsnSacCode,
        unit: createProductServiceDto.unit,
        defaultRate: createProductServiceDto.defaultRate,
        taxPercentage: createProductServiceDto.taxPercentage,
        status: createProductServiceDto.status ?? ProductServiceStatus.ACTIVE,
      },
      select: productServiceSelect,
    });
  }

  async updateProductService(
    productServiceId: string,
    updateProductServiceDto: UpdateProductServiceDto,
  ): Promise<ProductServiceRecord> {
    await this.getProductServiceOrThrow(productServiceId);

    return this.prismaService.productService.update({
      where: {
        id: productServiceId,
      },
      data: {
        name: updateProductServiceDto.name,
        type: updateProductServiceDto.type,
        description: updateProductServiceDto.description,
        hsnSacCode: updateProductServiceDto.hsnSacCode,
        unit: updateProductServiceDto.unit,
        defaultRate: updateProductServiceDto.defaultRate,
        taxPercentage: updateProductServiceDto.taxPercentage,
        status: updateProductServiceDto.status,
      },
      select: productServiceSelect,
    });
  }

  async deleteProductService(productServiceId: string): Promise<ProductServiceRecord> {
    await this.getProductServiceOrThrow(productServiceId);

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

    return this.prismaService.productService.delete({
      where: {
        id: productServiceId,
      },
      select: productServiceSelect,
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
}
