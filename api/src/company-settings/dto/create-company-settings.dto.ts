import { CompanyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCompanySettingsDto {
  @IsString()
  companyName!: string;

  @IsString()
  phone!: string;

  @IsString()
  email!: string;

  @IsString()
  gstin!: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  pinCode!: string;

  @IsString()
  country!: string;

  @IsString()
  bankName!: string;

  @IsString()
  accountNumber!: string;

  @IsString()
  ifscCode!: string;

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
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
