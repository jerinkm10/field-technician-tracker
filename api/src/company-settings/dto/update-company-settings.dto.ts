import { CompanyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pinCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsString()
  logoAttachment?: string;

  @IsOptional()
  @IsString()
  signatureAttachment?: string;

  @IsOptional()
  @IsString()
  sealAttachment?: string;

  @IsOptional()
  @IsString()
  invoiceTermsAndConditions?: string;

  @IsOptional()
  @IsString()
  proformaTermsAndConditions?: string;

  @IsOptional()
  @IsString()
  quotationTermsAndConditions?: string;

  @IsOptional()
  @IsString()
  amcTermsAndConditions?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
