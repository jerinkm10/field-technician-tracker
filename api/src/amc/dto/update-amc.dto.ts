import { AmcBillingPeriod, AmcStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateAmcDto {
  @IsOptional()
  @IsString()
  amcNumber?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AmcBillingPeriod)
  billingPeriod?: AmcBillingPeriod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  contractAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

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
  note?: string;
}
