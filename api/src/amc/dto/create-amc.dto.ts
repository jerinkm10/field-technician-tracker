import { AmcBillingPeriod, AmcStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAmcDto {
  @IsString()
  amcNumber!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  branchId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(AmcBillingPeriod)
  billingPeriod!: AmcBillingPeriod;

  @IsNumber()
  @Min(0)
  contractAmount!: number;

  @IsNumber()
  @Min(0)
  taxPercentage!: number;

  @IsOptional()
  @IsEnum(AmcStatus)
  status?: AmcStatus;

  @IsOptional()
  @IsDateString()
  lastPaidDate?: string;

  @IsOptional()
  @IsDateString()
  nextBillingDate?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
