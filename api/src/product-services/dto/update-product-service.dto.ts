import {
  ProductServiceStatus,
  ProductServiceType,
} from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ProductServiceType)
  type?: ProductServiceType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hsnSacCode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

  @IsOptional()
  @IsEnum(ProductServiceStatus)
  status?: ProductServiceStatus;
}
