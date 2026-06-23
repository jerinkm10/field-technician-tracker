import {
  InvoiceType,
  OutstandingStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListOutstandingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsEnum(OutstandingStatus)
  status?: OutstandingStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;
}
