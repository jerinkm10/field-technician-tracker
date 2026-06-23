import {
  ProductServiceStatus,
  ProductServiceType,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListProductServicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProductServiceType)
  type?: ProductServiceType;

  @IsOptional()
  @IsEnum(ProductServiceStatus)
  status?: ProductServiceStatus;

  @IsOptional()
  @IsString()
  hsnSacCode?: string;
}
