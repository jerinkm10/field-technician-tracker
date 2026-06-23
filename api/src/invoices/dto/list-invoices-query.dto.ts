import { InvoiceType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'] as const)
  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
