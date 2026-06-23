import { QuotationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { QuotationLineItemDto } from './quotation-line-item.dto';

export class CreateQuotationDto {
  @IsString()
  quotationNumber!: string;

  @IsDateString()
  quotationDate!: string;

  @IsDateString()
  validUntil!: string;

  @IsString()
  supplierId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  customerName!: string;

  @IsString()
  customerAddress!: string;

  @IsString()
  customerGstin!: string;

  @IsString()
  placeOfSupply!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsNumber()
  totalBeforeTax!: number;

  @IsNumber()
  totalTaxAmount!: number;

  @IsNumber()
  roundedOff!: number;

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lineItems!: QuotationLineItemDto[];
}
