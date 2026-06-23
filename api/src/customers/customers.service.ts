import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerStatus, Prisma } from '@prisma/client';
import { createPaginationMeta, normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const customerSelect = Prisma.validator<Prisma.CustomerSelect>()({
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
});

type CustomerRecord = Prisma.CustomerGetPayload<{
  select: typeof customerSelect;
}>;

@Injectable()
export class CustomersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listCustomers(query: ListCustomersQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.CustomerWhereInput = {
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
                name: {
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

    const [total, customers] = await Promise.all([
      this.prismaService.customer.count({ where }),
      this.prismaService.customer.findMany({
        where,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
        select: customerSelect,
      }),
    ]);

    return {
      data: customers.map((customer) => this.toApiCustomer(customer)),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getCustomerById(customerId: string) {
    return this.toApiCustomer(await this.getCustomerOrThrow(customerId));
  }

  async createCustomer(createCustomerDto: CreateCustomerDto) {
    try {
      const customer = await this.prismaService.customer.create({
        data: {
          name: createCustomerDto.customerName,
          phone: createCustomerDto.phone,
          email: createCustomerDto.email,
          gstin: createCustomerDto.gstin,
          address:
            createCustomerDto.address ?? createCustomerDto.billingAddress,
          billingAddress: createCustomerDto.billingAddress,
          shippingAddress:
            createCustomerDto.shippingAddress ?? createCustomerDto.billingAddress,
          placeOfSupply: createCustomerDto.placeOfSupply,
          latitude: createCustomerDto.latitude,
          longitude: createCustomerDto.longitude,
          status: createCustomerDto.status ?? CustomerStatus.ACTIVE,
        },
        select: customerSelect,
      });

      return this.toApiCustomer(customer);
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Customer GSTIN must be unique');
    }
  }

  async updateCustomer(
    customerId: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    await this.getCustomerOrThrow(customerId);

    try {
      const customer = await this.prismaService.customer.update({
        where: {
          id: customerId,
        },
        data: {
          name: updateCustomerDto.customerName,
          phone: updateCustomerDto.phone,
          email: updateCustomerDto.email,
          gstin: updateCustomerDto.gstin,
          address: updateCustomerDto.address ?? updateCustomerDto.billingAddress,
          billingAddress: updateCustomerDto.billingAddress,
          shippingAddress: updateCustomerDto.shippingAddress,
          placeOfSupply: updateCustomerDto.placeOfSupply,
          latitude: updateCustomerDto.latitude,
          longitude: updateCustomerDto.longitude,
          status: updateCustomerDto.status,
        },
        select: customerSelect,
      });

      return this.toApiCustomer(customer);
    } catch (error) {
      this.rethrowUniqueConstraint(error, 'Customer GSTIN must be unique');
    }
  }

  async deleteCustomer(customerId: string) {
    await this.getCustomerOrThrow(customerId);

    const [invoiceCount, quotationCount, jobCount] = await Promise.all([
      this.prismaService.invoice.count({
        where: { customerId },
      }),
      this.prismaService.quotation.count({
        where: { customerId },
      }),
      this.prismaService.job.count({
        where: { customerId },
      }),
    ]);

    if (invoiceCount > 0 || quotationCount > 0 || jobCount > 0) {
      throw new ConflictException(
        'Customers linked to jobs, invoices, or quotations cannot be deleted',
      );
    }

    const customer = await this.prismaService.customer.delete({
      where: { id: customerId },
      select: customerSelect,
    });

    return this.toApiCustomer(customer);
  }

  private async getCustomerOrThrow(customerId: string): Promise<CustomerRecord> {
    const customer = await this.prismaService.customer.findUnique({
      where: { id: customerId },
      select: customerSelect,
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private toApiCustomer(customer: CustomerRecord) {
    return {
      id: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      gstin: customer.gstin,
      billingAddress: customer.billingAddress ?? customer.address,
      shippingAddress: customer.shippingAddress ?? customer.billingAddress ?? customer.address,
      placeOfSupply: customer.placeOfSupply,
      address: customer.address,
      latitude: customer.latitude,
      longitude: customer.longitude,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
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
