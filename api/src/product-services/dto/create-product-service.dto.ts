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

export class CreateProductServiceDto {
  @IsString()
  name!: string;

  @IsEnum(ProductServiceType)
  type!: ProductServiceType;

  @IsString()
  description!: string;

  @IsString()
  hsnSacCode!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  defaultRate!: number;

  @IsNumber()
  @Min(0)
  taxPercentage!: number;

  @IsOptional()
  @IsEnum(ProductServiceStatus)
  status?: ProductServiceStatus;
}
