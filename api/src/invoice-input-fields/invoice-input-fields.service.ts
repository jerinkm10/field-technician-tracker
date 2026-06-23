import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  createPaginationMeta,
  normalizePagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceInputFieldDto } from './dto/create-invoice-input-field.dto';
import { ListInvoiceInputFieldsQueryDto } from './dto/list-invoice-input-fields-query.dto';
import { UpdateInvoiceInputFieldDto } from './dto/update-invoice-input-field.dto';

const invoiceInputFieldSelect =
  Prisma.validator<Prisma.InvoiceInputFieldSelect>()({
    id: true,
    section: true,
    fieldKey: true,
    label: true,
    inputType: true,
    placeholder: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  });

@Injectable()
export class InvoiceInputFieldsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listInvoiceInputFields(query: ListInvoiceInputFieldsQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.InvoiceInputFieldWhereInput = {
      ...(query.section?.trim()
        ? {
            section: {
              equals: query.section.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
      ...(search
        ? {
            OR: [
              {
                label: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                fieldKey: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                section: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prismaService.invoiceInputField.count({ where }),
      this.prismaService.invoiceInputField.findMany({
        where,
        orderBy: [{ section: 'asc' }, { label: 'asc' }],
        skip,
        take: limit,
        select: invoiceInputFieldSelect,
      }),
    ]);

    return {
      data: items,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getInvoiceInputFieldById(fieldId: string) {
    return this.getInvoiceInputFieldOrThrow(fieldId);
  }

  async createInvoiceInputField(
    createInvoiceInputFieldDto: CreateInvoiceInputFieldDto,
  ) {
    try {
      return await this.prismaService.invoiceInputField.create({
        data: {
          section: createInvoiceInputFieldDto.section,
          fieldKey: createInvoiceInputFieldDto.fieldKey,
          label: createInvoiceInputFieldDto.label,
          inputType: createInvoiceInputFieldDto.inputType,
          placeholder: createInvoiceInputFieldDto.placeholder,
          isActive: createInvoiceInputFieldDto.isActive ?? true,
        },
        select: invoiceInputFieldSelect,
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  async updateInvoiceInputField(
    fieldId: string,
    updateInvoiceInputFieldDto: UpdateInvoiceInputFieldDto,
  ) {
    await this.getInvoiceInputFieldOrThrow(fieldId);

    try {
      return await this.prismaService.invoiceInputField.update({
        where: { id: fieldId },
        data: {
          section: updateInvoiceInputFieldDto.section,
          fieldKey: updateInvoiceInputFieldDto.fieldKey,
          label: updateInvoiceInputFieldDto.label,
          inputType: updateInvoiceInputFieldDto.inputType,
          placeholder: updateInvoiceInputFieldDto.placeholder,
          isActive: updateInvoiceInputFieldDto.isActive,
        },
        select: invoiceInputFieldSelect,
      });
    } catch (error) {
      this.rethrowUniqueConstraint(error);
    }
  }

  async deleteInvoiceInputField(fieldId: string) {
    await this.getInvoiceInputFieldOrThrow(fieldId);

    return this.prismaService.invoiceInputField.delete({
      where: { id: fieldId },
      select: invoiceInputFieldSelect,
    });
  }

  private async getInvoiceInputFieldOrThrow(fieldId: string) {
    const item = await this.prismaService.invoiceInputField.findUnique({
      where: { id: fieldId },
      select: invoiceInputFieldSelect,
    });

    if (!item) {
      throw new NotFoundException('Invoice input field not found');
    }

    return item;
  }

  private rethrowUniqueConstraint(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Field key must be unique');
    }

    throw error;
  }
}
