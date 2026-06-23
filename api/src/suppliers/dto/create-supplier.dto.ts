import { SupplierStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  supplierName!: string;

  @IsString()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  gstin!: string;

  @IsString()
  address!: string;

  @IsString()
  bankName!: string;

  @IsString()
  accountNumber!: string;

  @IsString()
  ifscCode!: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;
}
