import { InvoiceStatus, InvoiceType } from '@prisma/client';
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
import { InvoiceLineItemDto } from './invoice-line-item.dto';

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  invoiceType!: InvoiceType;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsDateString()
  invoiceDate!: string;

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

  @IsNumber()
  amountDue!: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems!: InvoiceLineItemDto[];
}
